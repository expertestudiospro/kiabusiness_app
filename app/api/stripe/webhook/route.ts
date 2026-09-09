import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '@/lib/integrations/stripe';
import { getSupabaseAdmin } from '@/lib/integrations/supabase';
import { notifyAdmins } from '@/lib/integrations/push';
import { sendEmail } from '@/lib/email/send';
import { syncOrderToHolded, syncSubscriptionToHolded } from '@/lib/integrations/holded';
import { computeProfileReadiness } from '@/lib/utils/profile-readiness';
import { getCalOnboardingUrl, getCalFormacionUrl } from '@/lib/utils/cal';
import { persistAcademyCertificationPayment, persistAcademyProgramPayment } from '@/lib/payments/academy-fulfillment';
import { fulfillQuotePayment } from '@/lib/payments/quote-fulfillment';
import { legacyOrderFields, requireCreatedOrderId } from '@/lib/payments/non-academy-order';
import {
  academyEnrollmentConfirmed,
  academyEnrollmentConfirmedAdmin,
  academyEnrollmentPendingLink,
  academyEnrollmentPendingLinkAdmin,
  academyCertificationPaid,
  academyCertificationPaidAdmin,
  holdedFormacionConfirmed,
  holdedMigrationConfirmed,
  servicePaymentConfirmed,
  servicePaymentConfirmedAdmin,
  subscriptionCreated,
  subscriptionPaymentFailed
} from '@/lib/email/templates';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? 'info@expertconsulting.es')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;
type SubscriptionRecord = { clientId: string; companyId: string | null; planName: string; periodEnd: string | null };

function getPlanName(priceId: string, fallback?: string | null): string {
  if (fallback) return fallback;

  const map: Record<string, string> = {
    [process.env.STRIPE_PLAN_MONTHLY_49 ?? '']: 'Plan Supervisión',
    [process.env.STRIPE_PLAN_MONTHLY_99 ?? '']: 'Plan Avanzado',
    [process.env.STRIPE_PLAN_MONTHLY_199 ?? '']: 'Plan Colaborativo',
    [process.env.STRIPE_PLAN_MONTHLY_349 ?? '']: 'Plan Presupuesto Personalizado',
  };
  return map[priceId] ?? 'Suscripción';
}

function getStripeCustomerId(customer: Stripe.Subscription['customer']): string | null {
  return typeof customer === 'string' ? customer : customer?.id ?? null;
}

function getAllowedSubscriptionStatus(status: Stripe.Subscription.Status) {
  const allowed = ['active', 'canceled', 'past_due', 'unpaid', 'trialing'] as const;
  return allowed.includes(status as (typeof allowed)[number]) ? status : null;
}

function isActivatedSubscriptionStatus(status: string | undefined | null): boolean {
  return status === 'active' || status === 'trialing';
}

async function linkStripeCustomer(
  supabaseAdmin: SupabaseAdmin,
  clientId: string,
  customerId: string,
  companyId?: string | null,
): Promise<void> {
  if (!companyId) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', clientId);
    if (profileError) throw new Error(`Could not persist legacy Stripe customer: ${profileError.message}`);
    return;
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('profile_companies')
    .select('company_id')
    .eq('profile_id', clientId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not verify subscription company membership: ${membershipError.message}`);
  if (!membership) throw new Error(`Stripe subscription company ${companyId} does not belong to client ${clientId}`);

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .select('id,stripe_customer_id')
    .eq('id', companyId)
    .maybeSingle();
  if (companyError) throw new Error(`Could not load subscription company: ${companyError.message}`);
  if (!company) throw new Error(`Stripe subscription company ${companyId} was not found`);

  if (company.stripe_customer_id && company.stripe_customer_id !== customerId) {
    throw new Error(`Stripe customer conflict for company ${companyId}; manual review required`);
  }

  if (!company.stripe_customer_id) {
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', companyId);
    if (updateError) throw new Error(`Could not persist company Stripe customer: ${updateError.message}`);
  }
}

async function upsertSubscriptionFromStripe(
  supabaseAdmin: SupabaseAdmin,
  sub: Stripe.Subscription,
  userIdHint?: string | null,
  companyIdHint?: string | null,
): Promise<SubscriptionRecord | null> {
  const customerId = getStripeCustomerId(sub.customer);
  const priceId = sub.items.data[0]?.price.id ?? '';
  const status = getAllowedSubscriptionStatus(sub.status);

  if (!customerId || !priceId || !status) {
    console.warn('[webhook] subscription skipped: unsupported or incomplete data', {
      subscription: sub.id,
      status: sub.status,
      hasCustomer: Boolean(customerId),
      hasPrice: Boolean(priceId)
    });
    return null;
  }

  let clientId = userIdHint ?? sub.metadata?.user_id ?? null;
  const companyId = companyIdHint ?? sub.metadata?.company_id ?? null;

  if (!clientId && !companyId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    clientId = profile?.id ?? null;
  }

  if (!clientId) {
    console.error('[webhook] subscription has no resolvable EXPERT user', {
      subscription: sub.id,
      customer: customerId,
      company: companyId
    });
    return null;
  }

  const firstItem = sub.items.data[0];
  const periodStart = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString()
    : null;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;
  const planName = getPlanName(priceId, sub.metadata?.plan_name);

  await linkStripeCustomer(supabaseAdmin, clientId, customerId, companyId);

  const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').upsert(
    {
      client_id: clientId,
      company_id: companyId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      plan_name: planName,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'stripe_subscription_id' }
  );

  if (subscriptionError) {
    throw new Error(`Could not persist Stripe subscription ${sub.id}: ${subscriptionError.message}`);
  }

  return { clientId, companyId, planName, periodEnd };
}

async function getClientEmail(userId: string): Promise<{ email: string; name: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return null;

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
  return { email, name: profile?.full_name ?? email.split('@')[0] };
}

async function enqueueHoldedSync(
  supabaseAdmin: SupabaseAdmin,
  jobType: string,
  metadata: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('holded_sync_jobs')
    .insert({ job_type: jobType, status: 'queued', attempts: 0, metadata })
    .select('id')
    .single();
  if (error) {
    console.error('[holded queue] enqueue failed:', error.message);
    return null;
  }
  return data?.id ?? null;
}

async function resolveHoldedJob(
  supabaseAdmin: SupabaseAdmin,
  jobId: string | null,
  status: 'success' | 'failed',
  errorMsg?: string,
): Promise<void> {
  if (!jobId) return;
  await supabaseAdmin
    .from('holded_sync_jobs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      attempts: 1,
      error: errorMsg ? errorMsg.slice(0, 500) : null,
    })
    .eq('id', jobId)
    .then(() => null, () => null);
}

async function startHoldedJob(
  supabaseAdmin: SupabaseAdmin,
  jobId: string | null,
): Promise<void> {
  if (!jobId) return;
  await supabaseAdmin
    .from('holded_sync_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .then(() => null, () => null);
}

async function handleSubscriptionActivation(
  supabaseAdmin: SupabaseAdmin,
  sub: Stripe.Subscription,
  subscriptionRecord: SubscriptionRecord,
): Promise<void> {
  const clientInfo = await getClientEmail(subscriptionRecord.clientId);
  if (!clientInfo) return;

  const tpl = subscriptionCreated(clientInfo.name, subscriptionRecord.planName, subscriptionRecord.periodEnd);
  await sendEmail({
    to: clientInfo.email,
    eventType: 'subscription.created',
    ...tpl,
    metadata: { subscription_id: sub.id, plan: subscriptionRecord.planName, company_id: subscriptionRecord.companyId },
    idempotencyKey: `stripe/subscription-activation/client/${sub.id}`,
  });

  notifyAdmins({
    title: `⚡ Nueva suscripción — ${clientInfo.name}`,
    body: subscriptionRecord.planName,
    url: '/admin/suscripciones',
    tag: `sub-${sub.id}`,
  }).catch(() => {});

  const monthlyAmount = sub.items.data[0]?.price.unit_amount
    ? sub.items.data[0].price.unit_amount / 100
    : 0;

  const adminEmails = getAdminEmails();
  if (adminEmails.length) {
    const adminTpl = servicePaymentConfirmedAdmin(clientInfo.name, clientInfo.email, monthlyAmount, subscriptionRecord.planName);
    await sendEmail({
      to: adminEmails,
      eventType: 'subscription.created.admin',
      ...adminTpl,
      metadata: { subscription_id: sub.id, plan: subscriptionRecord.planName, company_id: subscriptionRecord.companyId },
      idempotencyKey: `stripe/subscription-activation/admin/${sub.id}`,
    });
  }

  const subJobId = await enqueueHoldedSync(supabaseAdmin, 'sync_subscription_holded', {
    clientName: clientInfo.name, clientEmail: clientInfo.email,
    planName: subscriptionRecord.planName, amountEur: monthlyAmount,
    subscriptionId: sub.id, companyId: subscriptionRecord.companyId,
    localEntity: 'stripe_subscriptions',
  });
  await startHoldedJob(supabaseAdmin, subJobId);
  syncSubscriptionToHolded({
    clientName: clientInfo.name,
    clientEmail: clientInfo.email,
    planName: subscriptionRecord.planName,
    amountEur: monthlyAmount,
    subscriptionId: sub.id,
    localEntity: 'stripe_subscriptions'
  }).then((result) => {
    void resolveHoldedJob(supabaseAdmin, subJobId, result.error ? 'failed' : 'success', result.error);
    if (result.invoiceId) {
      supabaseAdmin.from('subscriptions').update({
        metadata: {
          holded: {
            contact_id: result.contactId,
            invoice_id: result.invoiceId,
            sync_event_id: result.syncEventId
          }
        }
      }).eq('stripe_subscription_id', sub.id).then(() => {});
    }
  }).catch((err) => {
    console.error('[webhook] holded sync (subscription) failed:', err);
    void resolveHoldedJob(supabaseAdmin, subJobId, 'failed', err instanceof Error ? err.message : String(err));
  });
}

async function updateOrderHoldedResult(
  supabaseAdmin: SupabaseAdmin,
  orderId: string | undefined,
  result: { contactId: string | null; invoiceId: string | null; syncEventId: string | null; error?: string },
  baseMetadata: Record<string, unknown> = {}
) {
  if (!orderId) return;

  const holded = {
    contact_id: result.contactId,
    invoice_id: result.invoiceId,
    sync_event_id: result.syncEventId,
    error: result.error ?? null
  };

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: result.invoiceId ? 'paid' : 'paid_invoice_error',
      holded_invoice_id: result.invoiceId,
      holded_sync_event_id: result.syncEventId,
      holded_sync_error: result.error ?? null,
      holded_synced_at: new Date().toISOString(),
      metadata: { ...baseMetadata, holded }
    })
    .eq('id', orderId);

  if (error) {
    console.error('[webhook] holded order trace update failed:', error);
  }
}

async function fulfillAcademyCertification(supabaseAdmin: SupabaseAdmin, session: Stripe.Checkout.Session) {
  const enrollmentId = session.metadata?.enrollment_id ?? '';
  if (!enrollmentId) return;

  const programSlug = session.metadata?.program_slug ?? '';
  const programName = session.metadata?.program_name ?? 'Programa EXPERT Business Academy';
  const clientId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  const amountEur = Number(session.amount_total ?? 0) / 100;
  const paymentId = (session.payment_intent as string) ?? session.id;
  const customerEmail = session.customer_email ?? (session.customer_details as { email?: string } | null)?.email;
  const customerName =
    (session.customer_details as { name?: string } | null)?.name ??
    customerEmail?.split('@')[0] ??
    'Cliente';

  const persisted = await persistAcademyCertificationPayment(supabaseAdmin, {
    paymentId, sessionId: session.id, enrollmentId, clientId, customerEmail: customerEmail ?? null,
    programSlug, amountEur, currency: session.currency?.toUpperCase() ?? 'EUR',
  });
  if (!persisted.created) return;

  if (customerEmail) {
    const tpl = academyCertificationPaid(customerName, programName, amountEur);
    await sendEmail({
      to: customerEmail,
      eventType: 'academy.certification.paid',
      ...tpl,
      metadata: { session_id: session.id, enrollment_id: enrollmentId },
    });

    const adminEmails = getAdminEmails();
    if (adminEmails.length) {
      const adminTpl = academyCertificationPaidAdmin(customerName, customerEmail, programName, amountEur);
      sendEmail({
        to: adminEmails,
        eventType: 'academy.certification.paid.admin',
        ...adminTpl,
        metadata: { session_id: session.id, enrollment_id: enrollmentId },
      }).catch((err) => console.error('[webhook] admin certification email failed:', err));
    }

    notifyAdmins({
      title: `🎓 Certificación oficial pagada — ${customerName}`,
      body : `${programName.slice(0, 60)} · €${amountEur.toFixed(0)}`,
      url  : '/admin/academy-matriculas',
      tag  : `academy-certification-${session.id}`,
    }).catch(() => {});
  }

  console.log(JSON.stringify({ webhook: 'stripe', event: 'checkout.session.completed', product_type: 'academy_certification', enrollment_id: enrollmentId, session_id: session.id }));
}

async function fulfillAcademyProgram(supabaseAdmin: SupabaseAdmin, session: Stripe.Checkout.Session) {
  const programSlug = session.metadata?.program_slug ?? '';
  const programName = session.metadata?.program_name ?? 'Programa EXPERT Business Academy';
  const amountEur = Number(session.amount_total ?? 0) / 100;
  const paymentId = (session.payment_intent as string) ?? session.id;
  const customerEmail = session.customer_email ?? (session.customer_details as { email?: string } | null)?.email;
  const customerName =
    (session.customer_details as { name?: string } | null)?.name ??
    customerEmail?.split('@')[0] ??
    'Cliente';

  let clientId = session.client_reference_id ?? session.metadata?.user_id ?? null;
  if (!clientId && customerEmail) {
    const { data: matchedProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();
    clientId = matchedProfile?.id ?? null;
  }

  const persisted = await persistAcademyProgramPayment(supabaseAdmin, {
    paymentId, sessionId: session.id, clientId, customerEmail: customerEmail ?? null,
    programSlug, programName, amountEur, currency: session.currency?.toUpperCase() ?? 'EUR',
  });
  if (!persisted.created) return;

  if (clientId) {
    if (customerEmail) {
      const tpl = academyEnrollmentConfirmed(customerName, programName, amountEur);
      await sendEmail({
        to: customerEmail,
        eventType: 'academy.enrollment.confirmed',
        ...tpl,
        metadata: { session_id: session.id, program_slug: programSlug },
      });

      const adminEmails = getAdminEmails();
      if (adminEmails.length) {
        const adminTpl = academyEnrollmentConfirmedAdmin(customerName, customerEmail, programName, amountEur);
        sendEmail({
          to: adminEmails,
          eventType: 'academy.enrollment.confirmed.admin',
          ...adminTpl,
          metadata: { session_id: session.id, program_slug: programSlug },
        }).catch((err) => console.error('[webhook] admin academy email failed:', err));
      }

      notifyAdmins({
        title: `🎓 Nueva matrícula Academy — ${customerName}`,
        body : `${programName.slice(0, 60)} · €${amountEur.toFixed(0)}`,
        url  : '/admin/pagos',
        tag  : `academy-enrollment-${session.id}`,
      }).catch(() => {});
    }
  } else if (customerEmail) {
    const tpl = academyEnrollmentPendingLink(customerName, programName);
    await sendEmail({
      to: customerEmail,
      eventType: 'academy.enrollment.pending_link',
      ...tpl,
      metadata: { session_id: session.id, program_slug: programSlug },
    });

    const adminEmails = getAdminEmails();
    if (adminEmails.length) {
      const adminTpl = academyEnrollmentPendingLinkAdmin(customerName, customerEmail, programName, amountEur);
      sendEmail({
        to: adminEmails,
        eventType: 'academy.enrollment.pending_link.admin',
        ...adminTpl,
        metadata: { session_id: session.id, program_slug: programSlug },
      }).catch((err) => console.error('[webhook] admin pending-link email failed:', err));
    }

    notifyAdmins({
      title: `⚠️ Matrícula Academy sin vincular — ${customerName}`,
      body : `${programName.slice(0, 60)} · €${amountEur.toFixed(0)} · sin cuenta con ese email`,
      url  : '/admin/pagos',
      tag  : `academy-enrollment-pending-${session.id}`,
    }).catch(() => {});
  }

  console.log(JSON.stringify({ webhook: 'stripe', event: session.payment_status === 'paid' ? 'checkout.session.completed' : 'checkout.session.async_payment_succeeded', product_type: 'academy_program', program_slug: programSlug, session_id: session.id, linked: Boolean(clientId) }));
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    console.error('Stripe webhook verify failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_stripe_event', {
    p_event_id: event.id, p_event_type: event.type, p_lease_seconds: 300,
  });
  if (claimError) {
    console.error('[stripe webhook] event claim failed:', claimError.message);
    return NextResponse.json({ error: 'Webhook persistence unavailable' }, { status: 500 });
  }
  if (!claimed) return NextResponse.json({ received: true });

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === 'payment' && session.metadata?.quote_id && session.payment_status === 'paid') {
        await fulfillQuotePayment(supabaseAdmin, session);
      }

      const productType = session.metadata?.product_type;

      if (session.mode === 'payment' && productType === 'academy_program' && session.payment_status === 'paid') {
        await fulfillAcademyProgram(supabaseAdmin, session);
      }

      if (session.mode === 'payment' && productType === 'academy_certification' && session.payment_status === 'paid') {
        await fulfillAcademyCertification(supabaseAdmin, session);
      }

      if (session.mode === 'payment' && (productType === 'service' || productType === 'cart')) {
        const customerEmail = session.customer_email ?? (session.customer_details as { email?: string } | null)?.email;
        const customerName =
          (session.customer_details as { name?: string } | null)?.name ??
          customerEmail?.split('@')[0] ??
          'Cliente';
        const serviceName =
          session.metadata?.service_name ??
          session.metadata?.service_names ??
          'Servicio EXPERT';
        const amountEur = Number(session.amount_total ?? 0) / 100;
        const paymentId  = (session.payment_intent as string) ?? session.id;
        let catalogOrderMetadata: Record<string, unknown> = {
          checkout_session: {
            id             : session.id,
            payment_intent : session.payment_intent,
            customer_email : customerEmail ?? null,
            product_type   : productType,
          },
        };

        const { data: existingCatalogOrder } = await supabaseAdmin
          .from('orders')
          .select('id,metadata')
          .eq('stripe_payment_id', paymentId)
          .maybeSingle();

        let catalogOrderId: string | undefined;
        if (!existingCatalogOrder) {
          const { data: newCatalogOrder, error: catalogOrderError } = await supabaseAdmin
            .from('orders')
            .insert({
              source          : 'catalog',
              client_id       : session.client_reference_id ?? null,
              company_id      : session.metadata?.company_id ?? null,
              stripe_payment_id: paymentId,
              amount_eur      : amountEur,
              ...legacyOrderFields(amountEur, serviceName),
              currency        : session.currency?.toUpperCase() ?? 'EUR',
              status          : 'paid',
              service_slugs   : session.metadata?.service_slugs ?? session.metadata?.service_slug ?? null,
              metadata        : catalogOrderMetadata,
            })
            .select('id')
            .single();

          catalogOrderId = requireCreatedOrderId('catalog', catalogOrderError, newCatalogOrder?.id);
        } else {
          catalogOrderId = existingCatalogOrder.id;
          catalogOrderMetadata = (existingCatalogOrder.metadata ?? catalogOrderMetadata) as Record<string, unknown>;
        }

        if (session.client_reference_id) {
          try {
            const details = session.customer_details as {
              address?: { line1?: string | null; city?: string | null; postal_code?: string | null; state?: string | null; country?: string | null } | null;
              tax_ids?: Array<{ type: string; value: string | null }> | null;
            } | null;
            const addr = details?.address;
            const taxIdEntry = details?.tax_ids?.[0];

            const { data: currentProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name,phone,client_type,tax_id,address,city,postal_code,province,billing_country,habitual_address,habitual_city,habitual_postal_code')
              .eq('id', session.client_reference_id)
              .maybeSingle();

            const profileUpdates: Record<string, unknown> = {};
            if (addr?.line1)       profileUpdates.address = addr.line1;
            if (addr?.city)        profileUpdates.city = addr.city;
            if (addr?.postal_code) profileUpdates.postal_code = addr.postal_code;
            if (addr?.state)       profileUpdates.province = addr.state;
            if (addr?.country)     profileUpdates.billing_country = addr.country;
            if (taxIdEntry?.value) profileUpdates.tax_id = taxIdEntry.value;

            if (Object.keys(profileUpdates).length > 0 && currentProfile) {
              const merged = { ...currentProfile, ...profileUpdates };
              const readiness = computeProfileReadiness(merged);

              await supabaseAdmin
                .from('profiles')
                .update({
                  ...profileUpdates,
                  profile_completed: readiness.profileCompleted,
                  billing_ready: readiness.billingReady,
                  habitual_address_ready: readiness.habitualAddressReady,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', session.client_reference_id);
            }
          } catch (err) {
            console.error('[webhook] profile billing sync failed:', err);
          }
        }

        if (customerEmail) {
          const slugsRaw = session.metadata?.service_slugs ?? session.metadata?.service_slug ?? '';
          const slugList = slugsRaw.split(',').map((s: string) => s.trim());
          const holdedPackageSlugs = ['holded-pack-starter', 'holded-migracion-sin-inventario', 'holded-migracion-con-inventario', 'holded-migracion-laboral'];
          const isHoldedMigration = slugList.some((s: string) => holdedPackageSlugs.includes(s));
          const isHoldedFormacion = slugList.includes('holded-modulo-formacion');
          const calendlyOnboarding = getCalOnboardingUrl() ?? '';
          const calendlyFormacion = getCalFormacionUrl() ?? '';

          if (isHoldedMigration) {
            const packageName = serviceName;
            const tpl = holdedMigrationConfirmed(customerName, packageName, calendlyOnboarding, calendlyFormacion);
            await sendEmail({
              to: customerEmail,
              eventType: 'holded.migration.confirmed',
              ...tpl,
              metadata: { session_id: session.id, package_name: packageName }
            });
          } else if (isHoldedFormacion) {
            const tpl = holdedFormacionConfirmed(customerName, calendlyFormacion);
            await sendEmail({
              to: customerEmail,
              eventType: 'holded.formacion.confirmed',
              ...tpl,
              metadata: { session_id: session.id }
            });
          } else {
            const tpl = servicePaymentConfirmed(customerName, amountEur, serviceName);
            await sendEmail({
              to: customerEmail,
              eventType: 'service.payment.confirmed',
              ...tpl,
              metadata: {
                session_id: session.id,
                service_slug: session.metadata?.service_slug ?? session.metadata?.service_slugs ?? null
              }
            });
          }

          const adminEmails = getAdminEmails();
          if (adminEmails.length) {
            const adminTpl = servicePaymentConfirmedAdmin(customerName, customerEmail, amountEur, serviceName);
            sendEmail({
              to: adminEmails,
              eventType: 'service.payment.confirmed.admin',
              ...adminTpl,
              metadata: { session_id: session.id, product_type: productType }
            }).catch((err) => {
              console.error('[webhook] admin payment email failed:', err);
            });
          }
          notifyAdmins({
            title: `💰 Pago recibido — ${customerName}`,
            body:  `${serviceName.slice(0, 60)} · €${amountEur.toFixed(0)}`,
            url:   `/admin/pagos`,
            tag:   `catalog-payment-${session.id}`,
          }).catch(() => {});

          const catalogJobId = await enqueueHoldedSync(supabaseAdmin, 'sync_order_holded', {
            clientName: customerName, clientEmail: customerEmail,
            description: serviceName, amountEur,
            orderId: catalogOrderId ?? session.id, localEntity: 'orders',
          });
          await startHoldedJob(supabaseAdmin, catalogJobId);
          syncOrderToHolded({
            clientName: customerName,
            clientEmail: customerEmail,
            description: serviceName,
            amountEur,
            orderId: catalogOrderId ?? session.id,
            localEntity: 'orders'
          }).then((result) => {
            void resolveHoldedJob(supabaseAdmin, catalogJobId, result.error ? 'failed' : 'success', result.error);
            updateOrderHoldedResult(supabaseAdmin, catalogOrderId, result, catalogOrderMetadata).catch((err) => {
              console.error('[webhook] holded trace update (catalog) failed:', err);
            });
          }).catch((err) => {
            console.error('[webhook] holded sync (catalog) failed:', err);
            void resolveHoldedJob(supabaseAdmin, catalogJobId, 'failed', err instanceof Error ? err.message : String(err));
            updateOrderHoldedResult(
              supabaseAdmin,
              catalogOrderId,
              { contactId: null, invoiceId: null, syncEventId: null, error: err instanceof Error ? err.message : String(err) },
              catalogOrderMetadata
            ).catch(() => {});
          });
        }
      }

      if (productType === 'holded' || productType === 'holded_formacion') {
        const customerEmail = session.customer_email ?? (session.customer_details as { email?: string } | null)?.email;
        const customerName =
          (session.customer_details as { name?: string } | null)?.name ??
          customerEmail?.split('@')[0] ??
          'Cliente';

        if (customerEmail) {
          const calendlyOnboarding = getCalOnboardingUrl() ?? '';
          const calendlyFormacion = getCalFormacionUrl() ?? '';
          const holdedAmountEur = Number(session.amount_total ?? 0) / 100;
          if (productType === 'holded') {
            const packageName = session.metadata?.package_name ?? 'Paquete Holded';
            const tpl = holdedMigrationConfirmed(customerName, packageName, calendlyOnboarding, calendlyFormacion);
            await sendEmail({
              to: customerEmail,
              eventType: 'holded.migration.confirmed',
              ...tpl,
              metadata: { session_id: session.id, package_name: packageName }
            });
            void enqueueHoldedSync(supabaseAdmin, 'sync_holded_migration', {
              clientName: customerName, clientEmail: customerEmail,
              description: packageName, amountEur: holdedAmountEur,
              orderId: session.id, localEntity: 'stripe_checkout_sessions',
            }).then((migJobId) => {
              startHoldedJob(supabaseAdmin, migJobId).then(() => syncOrderToHolded({
                clientName: customerName, clientEmail: customerEmail,
                description: packageName, amountEur: holdedAmountEur,
                orderId: session.id, localEntity: 'stripe_checkout_sessions',
              })).then((result) => resolveHoldedJob(supabaseAdmin, migJobId, result.error ? 'failed' : 'success', result.error))
                .catch((err) => {
                  console.error('[webhook] holded sync (migration) failed:', err);
                  return resolveHoldedJob(supabaseAdmin, migJobId, 'failed', err instanceof Error ? err.message : String(err));
                });
            });
          } else {
            const tpl = holdedFormacionConfirmed(customerName, calendlyFormacion);
            await sendEmail({
              to: customerEmail,
              eventType: 'holded.formacion.confirmed',
              ...tpl,
              metadata: { session_id: session.id }
            });
            void enqueueHoldedSync(supabaseAdmin, 'sync_holded_formacion', {
              clientName: customerName, clientEmail: customerEmail,
              description: 'Formación EXPERT — sesión 2 h', amountEur: holdedAmountEur,
              orderId: session.id, localEntity: 'stripe_checkout_sessions',
            }).then((formJobId) => {
              startHoldedJob(supabaseAdmin, formJobId).then(() => syncOrderToHolded({
                clientName: customerName, clientEmail: customerEmail,
                description: 'Formación EXPERT — sesión 2 h', amountEur: holdedAmountEur,
                orderId: session.id, localEntity: 'stripe_checkout_sessions',
              })).then((result) => resolveHoldedJob(supabaseAdmin, formJobId, result.error ? 'failed' : 'success', result.error))
                .catch((err) => {
                  console.error('[webhook] holded sync (formacion) failed:', err);
                  return resolveHoldedJob(supabaseAdmin, formJobId, 'failed', err instanceof Error ? err.message : String(err));
                });
            });
          }
        }
      }

      if (session.mode === 'subscription') {
        const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
        const companyId = session.metadata?.company_id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        const { error: checkoutStatusError } = await supabaseAdmin
          .from('checkout_sessions')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);
        if (checkoutStatusError) throw new Error(`Could not mark checkout ${session.id} completed: ${checkoutStatusError.message}`);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionFromStripe(supabaseAdmin, subscription, userId, companyId);
        } else if (userId && session.customer) {
          const customerId =
            typeof session.customer === 'string' ? session.customer : session.customer.id;
          await linkStripeCustomer(supabaseAdmin, userId, customerId, companyId);
        }
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription') {
        const { error: checkoutStatusError } = await supabaseAdmin
          .from('checkout_sessions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);
        if (checkoutStatusError) throw new Error(`Could not mark checkout ${session.id} expired: ${checkoutStatusError.message}`);
      }
    }

    if (event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.quote_id) {
        await fulfillQuotePayment(supabaseAdmin, session);
      } else if (session.metadata?.product_type === 'academy_certification') {
        await fulfillAcademyCertification(supabaseAdmin, session);
      } else if (session.metadata?.product_type === 'academy_program') {
        await fulfillAcademyProgram(supabaseAdmin, session);
      }
    }

    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription;
      const subscriptionRecord = await upsertSubscriptionFromStripe(supabaseAdmin, sub);
      if (subscriptionRecord && isActivatedSubscriptionStatus(sub.status)) {
        await handleSubscriptionActivation(supabaseAdmin, sub, subscriptionRecord);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const prevAttributes = event.data.previous_attributes as Record<string, unknown> | undefined;
      const prevStatus = prevAttributes?.status as string | undefined;

      const subscriptionRecord = await upsertSubscriptionFromStripe(supabaseAdmin, sub);
      const becameActivated = isActivatedSubscriptionStatus(sub.status) && !isActivatedSubscriptionStatus(prevStatus);
      if (subscriptionRecord && becameActivated) {
        await handleSubscriptionActivation(supabaseAdmin, sub, subscriptionRecord);
      }

      if (sub.status === 'past_due' && prevStatus !== 'past_due') {
        const { data: dbSub } = await supabaseAdmin
          .from('subscriptions')
          .select('client_id,plan_name')
          .eq('stripe_subscription_id', sub.id)
          .maybeSingle();

        const clientId = subscriptionRecord?.clientId ?? dbSub?.client_id;
        const planName = subscriptionRecord?.planName ?? dbSub?.plan_name ?? 'Suscripción';

        if (clientId) {
          const clientInfo = await getClientEmail(clientId);
          if (clientInfo) {
            const tpl = subscriptionPaymentFailed(clientInfo.name, planName);
            await sendEmail({
              to: clientInfo.email,
              eventType: 'subscription.payment_failed',
              ...tpl,
              metadata: { subscription_id: sub.id, company_id: subscriptionRecord?.companyId ?? null }
            });
          }
        }
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const parentSub = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof parentSub === 'string' ? parentSub : parentSub?.id;

      if (subscriptionId) {
        const { data: dbSub } = await supabaseAdmin
          .from('subscriptions')
          .select('client_id,plan_name,company_id')
          .eq('stripe_subscription_id', subscriptionId)
          .maybeSingle();

        if (dbSub?.client_id) {
          const clientInfo = await getClientEmail(dbSub.client_id);
          if (clientInfo) {
            const tpl = subscriptionPaymentFailed(clientInfo.name, dbSub.plan_name ?? 'Suscripción');
            await sendEmail({
              to: clientInfo.email,
              eventType: 'subscription.payment_failed',
              ...tpl,
              metadata: { subscription_id: subscriptionId, invoice_id: invoice.id, company_id: dbSub.company_id ?? null }
            });
          }
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const { error: deleteUpdateError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', sub.id);
      if (deleteUpdateError) {
        throw new Error(`Could not persist canceled Stripe subscription ${sub.id}: ${deleteUpdateError.message}`);
      }
    }

    const { error: completeError } = await supabaseAdmin.rpc('complete_stripe_event', { p_event_id: event.id });
    if (completeError) throw new Error(`Could not complete Stripe event: ${completeError.message}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[stripe webhook] processing failed:', event.id, message);
    await supabaseAdmin.rpc('fail_stripe_event', { p_event_id: event.id, p_error: message });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/integrations/supabase';
import { notifyAdmins } from '@/lib/integrations/push';
import { sendEmail } from '@/lib/email/send';
import { syncOrderToHolded } from '@/lib/integrations/holded';
import { getCalOnboardingUrl, getCalFormacionUrl } from '@/lib/utils/cal';
import {
  holdedFormacionConfirmed,
  holdedMigrationConfirmed,
  paymentConfirmed,
  servicePaymentConfirmedAdmin,
} from '@/lib/email/templates';
import { legacyOrderFields, requireCreatedOrderId } from '@/lib/payments/non-academy-order';

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type QuoteItemRow = {
  service_slug: string;
  description: string;
  quantity: number;
  unit_amount_eur: number | string;
  sort_order: number;
};

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? 'info@expertconsulting.es')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

async function getClientInfo(
  supabaseAdmin: SupabaseAdmin,
  clientId: string,
  fallbackEmail: string | null,
): Promise<{ email: string | null; name: string }> {
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(clientId);
  const email = authUser?.user?.email ?? fallbackEmail;
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', clientId)
    .maybeSingle();

  return {
    email: email ?? null,
    name: profile?.full_name ?? email?.split('@')[0] ?? 'Cliente',
  };
}

async function enqueueHoldedSync(
  supabaseAdmin: SupabaseAdmin,
  metadata: Record<string, unknown>,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('holded_sync_jobs')
    .insert({ job_type: 'sync_order_holded', status: 'queued', attempts: 0, metadata })
    .select('id')
    .single();
  if (error) {
    console.error('[quote fulfillment] Holded queue insert failed:', error.message);
    return null;
  }
  return data?.id ?? null;
}

async function startHoldedJob(supabaseAdmin: SupabaseAdmin, jobId: string | null): Promise<void> {
  if (!jobId) return;
  await supabaseAdmin
    .from('holded_sync_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', jobId)
    .then(() => null, () => null);
}

async function finishHoldedJob(
  supabaseAdmin: SupabaseAdmin,
  jobId: string | null,
  status: 'success' | 'failed',
  error?: string,
): Promise<void> {
  if (!jobId) return;
  await supabaseAdmin
    .from('holded_sync_jobs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      attempts: 1,
      error: error ? error.slice(0, 500) : null,
    })
    .eq('id', jobId)
    .then(() => null, () => null);
}

function deriveCaseWorkflow(items: QuoteItemRow[], hasDocuments: boolean) {
  const slugs = items.map((item) => item.service_slug);
  const hasLaborMigration = slugs.includes('holded-migracion-laboral');
  const hasTraining = slugs.includes('holded-modulo-formacion');

  let nextAction: string | null = null;
  if (hasLaborMigration && hasTraining) {
    nextAction = 'Aportar documentación laboral en el portal seguro y agendar la formación Holded de 2 h.';
  } else if (hasLaborMigration) {
    nextAction = 'Aportar documentación laboral en el portal seguro para iniciar la migración.';
  } else if (hasTraining) {
    nextAction = 'Agendar la formación Holded de 2 h.';
  }

  return {
    category: hasLaborMigration || hasTraining ? 'holded' : 'presupuesto',
    serviceId: items[0]?.service_slug ?? null,
    status: hasDocuments ? 'pendiente_cliente' : 'nuevo',
    state: hasDocuments ? 'pendiente_documentacion' : 'en_proceso',
    nextAction,
    hasLaborMigration,
    hasTraining,
    slugs,
  };
}

export async function fulfillQuotePayment(
  supabaseAdmin: SupabaseAdmin,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== 'paid') return;

  const quoteId = session.metadata?.quote_id ?? null;
  if (!quoteId) return;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('quotes')
    .select('id,client_id,company_id,title,description,amount_eur,docs_checklist,status')
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteError || !quote) throw new Error(`Quote ${quoteId} not found for paid checkout`);
  if (!quote.client_id) throw new Error(`Quote ${quoteId} has no client_id`);

  const metadataCompanyId = session.metadata?.company_id ?? null;
  if (quote.company_id && metadataCompanyId && quote.company_id !== metadataCompanyId) {
    throw new Error(`Quote ${quoteId} company mismatch; manual review required`);
  }

  const expectedSubtotal = Number(quote.amount_eur);
  const stripeSubtotal = Number(session.amount_subtotal ?? 0) / 100;
  if (stripeSubtotal > 0 && Math.abs(expectedSubtotal - stripeSubtotal) > 0.01) {
    throw new Error(`Quote ${quoteId} subtotal mismatch; manual review required`);
  }

  const { data: quoteItems, error: quoteItemsError } = await supabaseAdmin
    .from('quote_items')
    .select('service_slug,description,quantity,unit_amount_eur,sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });
  if (quoteItemsError) throw new Error(`Could not load quote items for ${quoteId}: ${quoteItemsError.message}`);

  const items = (quoteItems ?? []) as QuoteItemRow[];
  const docsChecklist = Array.isArray(quote.docs_checklist) ? quote.docs_checklist : [];
  const workflow = deriveCaseWorkflow(items, docsChecklist.length > 0);
  const amountEur = Number(session.amount_total ?? 0) / 100;
  const paymentId = (session.payment_intent as string) ?? session.id;
  const currency = session.currency?.toUpperCase() ?? 'EUR';
  const customerEmail = session.customer_email ?? (session.customer_details as { email?: string } | null)?.email ?? null;

  const { error: quotePaidError } = await supabaseAdmin
    .from('quotes')
    .update({ status: 'paid', stripe_checkout_id: session.id })
    .eq('id', quoteId);
  if (quotePaidError) throw new Error(`Could not mark quote ${quoteId} paid: ${quotePaidError.message}`);

  const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
    .from('orders')
    .select('id,metadata,holded_invoice_id,holded_sync_event_id')
    .eq('stripe_payment_id', paymentId)
    .maybeSingle();
  if (existingOrderError) throw new Error(`Could not check quote order idempotency: ${existingOrderError.message}`);

  const orderMetadata = {
    checkout_session: {
      id: session.id,
      payment_intent: session.payment_intent,
      customer_email: customerEmail,
      quote_id: quoteId,
      company_id: quote.company_id ?? metadataCompanyId,
    },
    quote_items: items.map((item) => ({
      service_slug: item.service_slug,
      description: item.description,
      quantity: item.quantity,
      unit_amount_eur: Number(item.unit_amount_eur),
    })),
    fulfillment: {
      employee_count: session.metadata?.employee_count ?? null,
      training_pending: workflow.hasTraining,
    },
  };

  let orderId = existingOrder?.id as string | undefined;
  if (!orderId) {
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        source: 'quote',
        quote_id: quoteId,
        client_id: quote.client_id,
        company_id: quote.company_id ?? metadataCompanyId,
        stripe_payment_id: paymentId,
        amount_eur: amountEur,
        ...legacyOrderFields(amountEur, quote.title),
        currency,
        status: 'paid',
        service_slugs: workflow.slugs.join(',') || null,
        metadata: orderMetadata,
      })
      .select('id')
      .single();
    orderId = requireCreatedOrderId('quote', orderError, newOrder?.id);
  }

  const { data: existingCase, error: existingCaseError } = await supabaseAdmin
    .from('cases')
    .select('id')
    .eq('quote_id', quoteId)
    .maybeSingle();
  if (existingCaseError) throw new Error(`Could not check quote case idempotency: ${existingCaseError.message}`);

  if (!existingCase) {
    const structuredSummary = items.length
      ? items.map((item) => `${item.quantity} × ${item.description}`).join(' · ')
      : null;
    const { error: caseError } = await supabaseAdmin.from('cases').insert({
      quote_id: quoteId,
      order_id: orderId,
      client_id: quote.client_id,
      company_id: quote.company_id ?? metadataCompanyId,
      category: workflow.category,
      service: quote.title ?? 'Servicio EXPERT',
      service_id: workflow.serviceId,
      state: workflow.state,
      status: workflow.status,
      next_action: workflow.nextAction,
      docs_checklist: docsChecklist,
      checklist_json: docsChecklist,
      admin_note: structuredSummary
        ? `Servicios contratados: ${structuredSummary}${workflow.hasTraining ? '. Formación Holded pendiente de agenda.' : ''}`
        : null,
    });
    if (caseError) throw new Error(`Could not create case for quote ${quoteId}: ${caseError.message}`);
  }

  const client = await getClientInfo(supabaseAdmin, quote.client_id, customerEmail);
  if (client.email) {
    const calendlyOnboarding = getCalOnboardingUrl() ?? '';
    const calendlyFormacion = getCalFormacionUrl() ?? '';

    if (workflow.hasLaborMigration) {
      const tpl = holdedMigrationConfirmed(client.name, quote.title ?? 'Migración laboral a Holded', calendlyOnboarding, calendlyFormacion);
      await sendEmail({
        to: client.email,
        eventType: 'holded.migration.confirmed',
        ...tpl,
        metadata: { quote_id: quoteId, session_id: session.id, company_id: quote.company_id, employee_count: session.metadata?.employee_count ?? null },
        idempotencyKey: `stripe/quote/${quoteId}/client/holded-migration`,
      });
    } else if (workflow.hasTraining) {
      const tpl = holdedFormacionConfirmed(client.name, calendlyFormacion);
      await sendEmail({
        to: client.email,
        eventType: 'holded.formacion.confirmed',
        ...tpl,
        metadata: { quote_id: quoteId, session_id: session.id, company_id: quote.company_id },
        idempotencyKey: `stripe/quote/${quoteId}/client/holded-training`,
      });
    } else {
      const tpl = paymentConfirmed(client.name, amountEur, quote.title ?? 'Servicio contratado');
      await sendEmail({
        to: client.email,
        eventType: 'payment.confirmed',
        ...tpl,
        metadata: { quote_id: quoteId, session_id: session.id, company_id: quote.company_id },
        idempotencyKey: `stripe/quote/${quoteId}/client/payment-confirmed`,
      });
    }

    const adminEmails = getAdminEmails();
    if (adminEmails.length) {
      const adminTpl = servicePaymentConfirmedAdmin(client.name, client.email, amountEur, quote.title ?? 'Presupuesto');
      await sendEmail({
        to: adminEmails,
        eventType: 'payment.confirmed.admin',
        ...adminTpl,
        metadata: { quote_id: quoteId, session_id: session.id, company_id: quote.company_id },
        idempotencyKey: `stripe/quote/${quoteId}/admin/payment-confirmed`,
      });
    }

    notifyAdmins({
      title: `💰 Pago recibido — ${client.name}`,
      body: `${(quote.title ?? 'Presupuesto').slice(0, 60)} · €${amountEur.toFixed(0)}`,
      url: '/admin/presupuestos',
      tag: `payment-${quoteId}`,
    }).catch(() => {});

    if (!existingOrder?.holded_invoice_id && !existingOrder?.holded_sync_event_id) {
      const jobId = await enqueueHoldedSync(supabaseAdmin, {
        clientName: client.name,
        clientEmail: client.email,
        description: quote.title ?? 'Servicio EXPERT',
        amountEur,
        orderId,
        companyId: quote.company_id ?? metadataCompanyId,
        quoteId,
        localEntity: 'orders',
      });
      await startHoldedJob(supabaseAdmin, jobId);

      syncOrderToHolded({
        clientName: client.name,
        clientEmail: client.email,
        description: quote.title ?? 'Servicio EXPERT',
        amountEur,
        orderId: orderId ?? session.id,
        localEntity: 'orders',
      }).then(async (result) => {
        await finishHoldedJob(supabaseAdmin, jobId, result.error ? 'failed' : 'success', result.error);
        if (!orderId) return;
        await supabaseAdmin.from('orders').update({
          status: result.invoiceId ? 'paid' : 'paid_invoice_error',
          holded_invoice_id: result.invoiceId,
          holded_sync_event_id: result.syncEventId,
          holded_sync_error: result.error ?? null,
          holded_synced_at: new Date().toISOString(),
          metadata: {
            ...orderMetadata,
            holded: {
              contact_id: result.contactId,
              invoice_id: result.invoiceId,
              sync_event_id: result.syncEventId,
              error: result.error ?? null,
            },
          },
        }).eq('id', orderId);
      }).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[quote fulfillment] Holded sync failed:', message);
        await finishHoldedJob(supabaseAdmin, jobId, 'failed', message);
      });
    }
  }
}

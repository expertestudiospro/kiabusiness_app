import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, getSupabaseAdmin, listAllAuthUsers } from '@/lib/integrations/supabase';
import { getStripeClient, toStripeAscii } from '@/lib/integrations/stripe';
import { sendEmail } from '@/lib/email/send';
import { quoteWithPaymentLink } from '@/lib/email/templates';
import { getRandomFunFact } from '@/lib/utils/fun-facts';
import { generateContractHtml, contractToBuffer } from '@/lib/utils/contract';
import { getPublicAppUrl } from '@/lib/utils/app-url';
import { syncQuoteAsEstimate } from '@/lib/integrations/holded';
import { quoteItemsSubtotal, resolveQuoteItems } from '@/lib/quotes/quote-items';

const quoteSchema = z.object({
  clientEmail: z.string().email('Email de cliente inválido'),
  companyId: z.string().uuid().nullable().optional(),
  title: z.string().min(3, 'Título demasiado corto'),
  description: z.string().min(5, 'Descripción demasiado corta'),
  amountEur: z.number().positive('El importe debe ser positivo').optional(),
  items: z.array(z.object({
    serviceSlug: z.string().min(1),
    quantity: z.number().int().positive().optional(),
  })).min(1).max(20).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(14),
  docsChecklist: z.array(z.string()).default([])
}).refine((value) => Boolean(value.items?.length || value.amountEur), {
  message: 'Indica un importe o añade servicios al presupuesto.'
});

async function requireAdmin(request: NextRequest): Promise<string | null> {
  const supabase = createServerSupabaseClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single();
  return (profile?.role === 'admin' || profile?.role === 'owner') ? user.id : null;
}

export async function POST(request: NextRequest) {
  try {
    const actorId = await requireAdmin(request);
    if (!actorId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 });
    }

    const { clientEmail, title, description, expiresInDays, docsChecklist } = parsed.data;
    let resolvedItems: ReturnType<typeof resolveQuoteItems> = [];
    try {
      resolvedItems = parsed.data.items ? resolveQuoteItems(parsed.data.items) : [];
    } catch (itemError) {
      return NextResponse.json({
        error: itemError instanceof Error ? itemError.message : 'Servicios del presupuesto no válidos.'
      }, { status: 400 });
    }

    const amountEur = resolvedItems.length
      ? quoteItemsSubtotal(resolvedItems)
      : parsed.data.amountEur!;

    if (resolvedItems.length && parsed.data.amountEur != null && Math.abs(parsed.data.amountEur - amountEur) > 0.001) {
      return NextResponse.json({ error: 'El importe no coincide con las líneas del catálogo.' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    const listData = await listAllAuthUsers();
    const authUser = listData.find((u) => u.email?.toLowerCase() === clientEmail.toLowerCase());
    if (!authUser) {
      return NextResponse.json({ error: 'No existe ningún usuario con ese email. Crea el usuario primero.' }, { status: 404 });
    }
    const clientId = authUser.id;

    const { data: clientProfile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('full_name,company,tax_id,address,city,postal_code,active_company_id')
      .eq('id', clientId)
      .single();
    if (profileError || !clientProfile) {
      return NextResponse.json({ error: 'No se pudo cargar el perfil del cliente' }, { status: 500 });
    }

    const { data: memberships, error: membershipsError } = await adminSupabase
      .from('profile_companies')
      .select('company_id,company:companies(id,razon_social,cif_nif,forma_juridica,direccion,ciudad,codigo_postal,pais,email,telefono,stripe_customer_id)')
      .eq('profile_id', clientId);
    if (membershipsError) {
      return NextResponse.json({ error: 'No se pudieron resolver las entidades del cliente' }, { status: 500 });
    }

    let companyId = parsed.data.companyId ?? clientProfile.active_company_id ?? null;
    if (!companyId && (memberships?.length ?? 0) === 1) companyId = memberships![0].company_id;
    if (!companyId) {
      return NextResponse.json({
        error: (memberships?.length ?? 0) > 1
          ? 'El cliente tiene varias entidades. Selecciona cuál contrata el servicio.'
          : 'El cliente necesita una entidad fiscal antes de contratar el servicio.',
        code: 'company_required'
      }, { status: 409 });
    }

    const selectedMembership = memberships?.find((m) => m.company_id === companyId) ?? null;
    if (!selectedMembership) {
      return NextResponse.json({ error: 'La entidad seleccionada no pertenece al cliente.' }, { status: 403 });
    }
    const companyRaw = selectedMembership.company;
    const contractingCompany = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
    if (!contractingCompany) {
      return NextResponse.json({ error: 'No se pudo cargar la entidad seleccionada' }, { status: 500 });
    }

    const clientName = clientProfile.full_name ?? clientEmail.split('@')[0];
    const contractingName = contractingCompany.razon_social ?? clientName;
    const contractingTaxId = contractingCompany.cif_nif ?? null;
    const contractingAddress = contractingCompany.ciudad
      ? `${contractingCompany.direccion ?? ''}, ${contractingCompany.ciudad}`.trim().replace(/^,\s*/, '')
      : contractingCompany.direccion ?? null;

    const { data: lead, error: leadErr } = await adminSupabase
      .from('leads')
      .insert({
        name: clientName,
        email: clientEmail,
        client_type: contractingCompany.forma_juridica === 'autonomo' ? 'autonomo' : 'empresa',
        category: 'presupuesto',
        service: title,
        state: 'converted'
      })
      .select('id')
      .single();

    if (leadErr || !lead) {
      console.error('[admin/quotes] lead insert error:', leadErr);
      return NextResponse.json({ error: 'Error al crear lead' }, { status: 500 });
    }

    const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();

    const { data: quote, error: quoteErr } = await adminSupabase
      .from('quotes')
      .insert({
        lead_id: lead.id,
        client_id: clientId,
        company_id: companyId,
        title,
        description,
        amount_eur: amountEur,
        status: 'sent',
        expires_at: expiresAt,
        created_by: actorId,
        docs_checklist: docsChecklist
      })
      .select('id')
      .single();

    if (quoteErr || !quote) {
      console.error('[admin/quotes] quote insert error:', quoteErr);
      await adminSupabase.from('leads').delete().eq('id', lead.id).then(() => {});
      return NextResponse.json({ error: 'Error al crear presupuesto' }, { status: 500 });
    }

    if (resolvedItems.length) {
      const { error: itemInsertError } = await adminSupabase.from('quote_items').insert(
        resolvedItems.map((item) => ({
          quote_id: quote.id,
          service_slug: item.serviceSlug,
          stripe_price_id: item.stripePriceId,
          description: item.description,
          quantity: item.quantity,
          unit_amount_eur: item.unitAmountEur,
          tax_behavior: item.taxBehavior,
          sort_order: item.sortOrder,
        }))
      );
      if (itemInsertError) {
        console.error('[admin/quotes] quote item insert error:', itemInsertError);
        await adminSupabase.from('leads').delete().eq('id', lead.id).then(() => {});
        return NextResponse.json({ error: 'No se pudieron guardar las líneas del presupuesto.' }, { status: 500 });
      }
    }

    const stripe = getStripeClient();
    const appUrl = getPublicAppUrl();

    let session;
    try {
      const itemMetadata: Record<string, string> = {};
      if (resolvedItems.length) {
        itemMetadata.service_slugs = resolvedItems.map((item) => item.serviceSlug).join(',').slice(0, 499);
        itemMetadata.employee_count = String(
          resolvedItems.find((item) => item.serviceSlug === 'holded-migracion-laboral')?.quantity ?? ''
        );
      }

      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: quote.id,
        customer: contractingCompany.stripe_customer_id ?? undefined,
        customer_email: contractingCompany.stripe_customer_id ? undefined : clientEmail,
        ...(contractingCompany.stripe_customer_id ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
        automatic_tax: { enabled: true },
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true, required: 'if_supported' },
        line_items: resolvedItems.length
          ? resolvedItems.map((item) => ({ price: item.stripePriceId, quantity: item.quantity }))
          : [{
              price_data: {
                currency: 'eur',
                unit_amount: Math.round(amountEur * 100),
                tax_behavior: 'exclusive',
                product_data: { name: toStripeAscii(title), description: toStripeAscii(description) }
              },
              quantity: 1
            }],
        metadata: {
          quote_id: quote.id,
          company_id: companyId,
          product_type: 'presupuesto',
          ...itemMetadata,
        },
        success_url: `${appUrl}/dashboard/expedientes?pago=ok`,
        cancel_url: `${appUrl}/dashboard/presupuestos`,
        expires_at: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
        locale: 'es',
      });
    } catch (stripeCreateError) {
      console.error('[admin/quotes] Stripe checkout creation failed:', stripeCreateError);
      await adminSupabase.from('leads').delete().eq('id', lead.id).then(() => {});
      return NextResponse.json({ error: 'No se pudo crear el enlace de pago' }, { status: 502 });
    }

    const { error: quoteStripeError } = await adminSupabase
      .from('quotes')
      .update({ stripe_checkout_id: session.id })
      .eq('id', quote.id);
    if (quoteStripeError) {
      try { await stripe.checkout.sessions.expire(session.id); } catch {}
      await adminSupabase.from('leads').delete().eq('id', lead.id).then(() => {});
      return NextResponse.json({ error: 'No se pudo registrar de forma segura el enlace de pago' }, { status: 500 });
    }

    const contractDate = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    const contractHtml = generateContractHtml({
      clientName,
      clientEmail,
      clientCompany: contractingName,
      clientTaxId: contractingTaxId,
      clientAddress: contractingAddress,
      serviceTitle: title,
      serviceDescription: description,
      amountEur,
      contractDate,
      contractType: 'service'
    });
    const contractBase64 = contractToBuffer(contractHtml);

    const funFact = getRandomFunFact();
    const tpl = quoteWithPaymentLink(clientName, amountEur, title, session.url!, expiresAt, funFact);

    try {
      await sendEmail({
        to: clientEmail,
        eventType: 'quote.payment_link_sent',
        ...tpl,
        metadata: { quote_id: quote.id, company_id: companyId, session_id: session.id },
        attachments: [
          {
            filename: `Contrato_EXPERT_${title.replace(/\s+/g, '_').slice(0, 40)}.html`,
            content: contractBase64,
            type: 'text/html'
          }
        ]
      });
    } catch (emailError) {
      console.error('[admin/quotes] delivery email failed:', emailError);
      let expireFailed = false;
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        expireFailed = true;
        console.error('[admin/quotes] failed to expire checkout after email failure:', expireError);
      }

      if (!expireFailed) {
        const { error: cleanupError } = await adminSupabase.from('leads').delete().eq('id', lead.id);
        if (cleanupError) {
          console.error('[admin/quotes] failed to clean request-created quote after email failure:', cleanupError);
          return NextResponse.json({
            error: 'El email falló y el enlace fue invalidado, pero no se pudo limpiar el presupuesto creado. Revisión manual necesaria.',
            code: 'email_failed_cleanup_manual_review'
          }, { status: 409 });
        }
        return NextResponse.json({
          error: 'El email no pudo enviarse. El enlace fue invalidado y el presupuesto de esta petición se revirtió de forma segura.',
          code: 'email_failed_safe_retry'
        }, { status: 502 });
      }

      return NextResponse.json({
        error: 'El email falló y no se pudo invalidar automáticamente el enlace Stripe. No reintentes hasta revisar esta sesión.',
        code: 'email_failed_manual_review',
        quoteId: quote.id
      }, { status: 409 });
    }

    await adminSupabase.from('audit_logs').insert({
      actor_id: actorId,
      action: 'quote.sent',
      entity: 'quotes',
      entity_id: quote.id,
      metadata: {
        client_email: clientEmail,
        company_id: companyId,
        amount_eur: amountEur,
        stripe_session: session.id,
        service_slugs: resolvedItems.map((item) => item.serviceSlug),
      }
    }).then(() => {});

    syncQuoteAsEstimate({
      quoteId: quote.id,
      clientName: contractingName,
      clientEmail,
      clientPhone: contractingCompany.telefono ?? null,
      title,
      amountEur,
    }).catch((e) => console.error('[admin/quotes] holded estimate sync:', e));

    return NextResponse.json({ ok: true, quoteId: quote.id, stripeUrl: session.url, companyId, amountEur });
  } catch (err) {
    console.error('[admin/quotes] error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

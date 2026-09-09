import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, toStripeAscii } from '@/lib/integrations/stripe';
import { createServerSupabaseClient, getSupabaseAdmin } from '@/lib/integrations/supabase';
import { getPublicAppUrl } from '@/lib/utils/app-url';
import { isCompanyBillingReady, missingCompanyBillingFields } from '@/lib/companies/billing-readiness';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const stripe = getStripeClient();
    const { id } = await params;
    const appUrl = getPublicAppUrl();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('amount_eur,title,description,status,client_id,company_id,expires_at')
      .eq('id', id)
      .single();

    if (quoteError || !quote) {
      console.error('Quote lookup failed:', quoteError);
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    if (quote.client_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (quote.status === 'paid' || quote.status === 'expired') {
      return NextResponse.json({ error: 'Este presupuesto no admite pago en su estado actual' }, { status: 400 });
    }

    if (quote.expires_at && new Date(quote.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin.from('quotes').update({ status: 'expired' }).eq('id', id).eq('client_id', user.id);
      return NextResponse.json({ error: 'Este presupuesto ha caducado.' }, { status: 400 });
    }

    if (!quote.company_id) {
      return NextResponse.json({ error: 'El presupuesto no tiene entidad contratante.', code: 'company_required' }, { status: 409 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('profile_companies')
      .select('company_id')
      .eq('profile_id', user.id)
      .eq('company_id', quote.company_id)
      .maybeSingle();
    if (membershipError) {
      return NextResponse.json({ error: 'No se pudo validar la entidad contratante.' }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: 'La entidad del presupuesto no pertenece al usuario.' }, { status: 403 });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('stripe_customer_id,razon_social,cif_nif,direccion,ciudad,codigo_postal,pais')
      .eq('id', quote.company_id)
      .maybeSingle();
    if (companyError || !company) {
      return NextResponse.json({ error: 'No se pudo cargar la entidad contratante.' }, { status: 500 });
    }
    if (!isCompanyBillingReady(company)) {
      return NextResponse.json({
        error: 'Completa los datos fiscales de la entidad antes de pagar.',
        code: 'billing_required',
        missingFields: missingCompanyBillingFields(company),
      }, { status: 409 });
    }

    const { data: quoteItems, error: quoteItemsError } = await supabaseAdmin
      .from('quote_items')
      .select('service_slug,stripe_price_id,description,quantity,unit_amount_eur,tax_behavior,sort_order')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true });

    if (quoteItemsError) {
      console.error('Quote item lookup failed:', quoteItemsError);
      return NextResponse.json({ error: 'No se pudieron cargar las líneas del presupuesto.' }, { status: 500 });
    }

    const amountEur = Number(quote.amount_eur);
    if (!amountEur || amountEur <= 0) {
      return NextResponse.json({ error: 'El presupuesto no tiene un importe válido para pago' }, { status: 400 });
    }

    const structuredSubtotal = (quoteItems ?? []).reduce(
      (sum, item) => sum + Number(item.unit_amount_eur) * Number(item.quantity),
      0,
    );
    if ((quoteItems?.length ?? 0) > 0 && Math.abs(structuredSubtotal - amountEur) > 0.001) {
      console.error('[quotes/checkout] persisted quote total mismatch', { quoteId: id, amountEur, structuredSubtotal });
      return NextResponse.json({ error: 'El presupuesto necesita revisión antes del pago.' }, { status: 409 });
    }

    const serviceSlugs = (quoteItems ?? []).map((item) => item.service_slug);
    const migrationItem = (quoteItems ?? []).find((item) => item.service_slug === 'holded-migracion-laboral');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: id,
      customer: company.stripe_customer_id ?? undefined,
      customer_email: company.stripe_customer_id ? undefined : user.email,
      ...(company.stripe_customer_id ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true, required: 'if_supported' },
      metadata: {
        quote_id: id,
        company_id: quote.company_id,
        product_type: 'presupuesto',
        service_slugs: serviceSlugs.join(',').slice(0, 499),
        employee_count: migrationItem ? String(migrationItem.quantity) : '',
      },
      line_items: (quoteItems?.length ?? 0) > 0
        ? quoteItems!.map((item) => ({ price: item.stripe_price_id, quantity: item.quantity }))
        : [{
            price_data: {
              currency: 'eur',
              product_data: {
                name: toStripeAscii(quote.title),
                description: quote.description ? toStripeAscii(quote.description) : undefined
              },
              unit_amount: Math.round(amountEur * 100),
              tax_behavior: 'exclusive',
            },
            quantity: 1
          }],
      success_url: `${appUrl}/gracias/pago?source=quote&quote=${id}`,
      cancel_url: `${appUrl}/dashboard/presupuestos`,
      locale: 'es',
    });

    const { error: persistError } = await supabaseAdmin
      .from('quotes')
      .update({ stripe_checkout_id: session.id })
      .eq('id', id)
      .eq('client_id', user.id);

    if (persistError) {
      try { await stripe.checkout.sessions.expire(session.id); } catch (expireError) {
        console.error('[quotes/checkout] failed to expire orphan session:', expireError);
      }
      return NextResponse.json({ error: 'No se pudo registrar de forma segura la sesión de pago.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, companyId: quote.company_id });
  } catch (error) {
    console.error('Quote checkout error:', error);
    return NextResponse.json({ error: 'Error al crear la sesión de pago' }, { status: 500 });
  }
}

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { listQuoteServices, quoteItemsSubtotal, resolveQuoteItems } from '@/lib/quotes/quote-items';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('itemized quote checkout', () => {
  it('prices 11 Holded migration employees plus one training module from the server catalog', () => {
    const items = resolveQuoteItems([
      { serviceSlug: 'holded-migracion-laboral', quantity: 11 },
      { serviceSlug: 'holded-modulo-formacion', quantity: 1 },
    ]);

    expect(items[0]).toMatchObject({
      serviceSlug: 'holded-migracion-laboral',
      stripePriceId: 'price_1UDKyMLeYwwgvux40YFzyVwi',
      quantity: 11,
      unitAmountEur: 50,
    });
    expect(items[1]).toMatchObject({
      serviceSlug: 'holded-modulo-formacion',
      stripePriceId: 'price_1SyB8ULeYwwgvux4sZbYod1B',
      quantity: 1,
      unitAmountEur: 180,
    });
    expect(quoteItemsSubtotal(items)).toBe(730);
  });

  it('enforces migration minimum and integer quantities', () => {
    expect(() => resolveQuoteItems([
      { serviceSlug: 'holded-migracion-laboral', quantity: 4 },
    ])).toThrow(/entre 5 y 200/);

    expect(() => resolveQuoteItems([
      { serviceSlug: 'holded-migracion-laboral', quantity: 5.5 },
    ])).toThrow(/entero/);
  });

  it('does not allow arbitrary quantity for fixed services', () => {
    expect(() => resolveQuoteItems([
      { serviceSlug: 'holded-modulo-formacion', quantity: 2 },
    ])).toThrow(/cantidad 1/);
  });

  it('rejects repeated structured service lines', () => {
    expect(() => resolveQuoteItems([
      { serviceSlug: 'holded-modulo-formacion', quantity: 1 },
      { serviceSlug: 'holded-modulo-formacion', quantity: 1 },
    ])).toThrow(/repetido/);
  });

  it('exposes only quote-safe catalog services and their quantity rules', () => {
    const services = listQuoteServices();
    expect(services).toEqual(expect.arrayContaining([
      expect.objectContaining({
        serviceSlug: 'holded-migracion-laboral',
        unitAmountEur: 50,
        minQuantity: 5,
        maxQuantity: 200,
      }),
      expect.objectContaining({
        serviceSlug: 'holded-modulo-formacion',
        unitAmountEur: 180,
        minQuantity: 1,
        maxQuantity: 1,
      }),
    ]));
    expect(services.some((service) => service.serviceSlug.startsWith('plan-'))).toBe(false);
  });

  it('persists quote lines behind quote ownership RLS', () => {
    const migration = source('supabase/migrations/20260908190000_quote_items_checkout.sql');
    expect(migration).toContain('create table if not exists public.quote_items');
    expect(migration).toContain('client view own quote items');
    expect(migration).toContain('q.client_id = auth.uid()');
    expect(migration).toContain('tenant_admin select quote items');
  });

  it('admin checkout ignores browser totals for structured lines and uses Stripe prices', () => {
    const route = source('app/api/admin/quotes/route.ts');
    expect(route).toContain('resolveQuoteItems(parsed.data.items)');
    expect(route).toContain('quoteItemsSubtotal(resolvedItems)');
    expect(route).toContain('El importe no coincide con las líneas del catálogo.');
    expect(route).toContain('price: item.stripePriceId, quantity: item.quantity');
    expect(route).toContain("automatic_tax: { enabled: true }");
    expect(route).toContain('itemMetadata.employee_count = String(');
    expect(route).toContain("item.serviceSlug === 'holded-migracion-laboral'");
  });

  it('admin quote UI selects client company and builds catalog lines without trusting price ids', () => {
    const modal = source('components/admin/NuevaCotizacionModal.tsx');
    const clients = source('app/api/admin/clients-quick/route.ts');
    const catalog = source('app/api/admin/quote-services/route.ts');

    expect(modal).toContain('Entidad contratante *');
    expect(modal).toContain('companyId: selectedCompanyId');
    expect(modal).toContain('items: lines');
    expect(modal).toContain("fetch('/api/admin/quote-services')");
    expect(modal).not.toContain('stripePriceId');
    expect(clients).toContain("company:companies(id,razon_social,cif_nif)");
    expect(catalog).toContain('listQuoteServices()');
  });

  it('client re-checkout validates ownership, company and persisted subtotal', () => {
    const route = source('app/api/quotes/[id]/checkout/route.ts');
    expect(route).toContain('quote.client_id !== user.id');
    expect(route).toContain(".eq('company_id', quote.company_id)");
    expect(route).toContain('structuredSubtotal');
    expect(route).toContain('El presupuesto necesita revisión antes del pago.');
    expect(route).toContain('await stripe.checkout.sessions.expire(session.id)');
  });

  it('classifies labor migration as a Holded service', () => {
    const registry = source('lib/services/service-registry.ts');
    expect(registry).toContain("'holded-migracion-laboral'");
  });

  it('fulfills quote payments only after Stripe confirms payment and supports async success', () => {
    const webhook = source('app/api/stripe/webhook/route.ts');
    expect(webhook).toContain("session.metadata?.quote_id && session.payment_status === 'paid'");
    expect(webhook).toContain('await fulfillQuotePayment(supabaseAdmin, session)');
    expect(webhook).toContain("event.type === 'checkout.session.async_payment_succeeded'");
  });

  it('quote fulfillment keeps company context, validates subtotal and recovers idempotently', () => {
    const fulfillment = source('lib/payments/quote-fulfillment.ts');
    expect(fulfillment).toContain("if (session.payment_status !== 'paid') return");
    expect(fulfillment).toContain('company mismatch; manual review required');
    expect(fulfillment).toContain('subtotal mismatch; manual review required');
    expect(fulfillment).toContain(".eq('stripe_payment_id', paymentId)");
    expect(fulfillment).toContain(".eq('quote_id', quoteId)");
    expect(fulfillment).toContain('company_id: quote.company_id ?? metadataCompanyId');
    expect(fulfillment).toContain('idempotencyKey: `stripe/quote/${quoteId}/client/');
  });

  it('records labor migration plus training as a Holded case with an explicit next action', () => {
    const fulfillment = source('lib/payments/quote-fulfillment.ts');
    expect(fulfillment).toContain("slugs.includes('holded-migracion-laboral')");
    expect(fulfillment).toContain("slugs.includes('holded-modulo-formacion')");
    expect(fulfillment).toContain('Aportar documentación laboral en el portal seguro y agendar la formación Holded de 2 h.');
    expect(fulfillment).toContain('Formación Holded pendiente de agenda.');
  });
});
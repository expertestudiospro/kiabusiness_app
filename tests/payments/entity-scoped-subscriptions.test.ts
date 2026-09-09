import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('entity-scoped billing', () => {
  it('rewires checkout_sessions.user_id to canonical profiles', () => {
    const migration = source('supabase/migrations/20260903190000_entity_scoped_subscriptions.sql');
    expect(migration).toContain('drop constraint if exists checkout_sessions_user_id_fkey');
    expect(migration).toMatch(/foreign key \(user_id\)[\s\S]*references public\.profiles\(id\)/);
    expect(migration).not.toMatch(/checkout_sessions_user_id_fkey[\s\S]*references public\.users\(id\)/);
  });

  it('protects Stripe subscription ownership from silent reassignment', () => {
    const migration = source('supabase/migrations/20260903190000_entity_scoped_subscriptions.sql');
    expect(migration).toContain('guard_stripe_subscription_ownership');
    expect(migration).toContain('new.client_id is distinct from old.client_id');
    expect(migration).toContain('new.company_id is distinct from old.company_id');
    expect(migration).toContain('new.stripe_customer_id is distinct from old.stripe_customer_id');
    expect(migration).toContain('manual review required');
  });

  it('customer checkout requires company billing readiness and a contracting entity', () => {
    const checkout = source('app/api/subscriptions/checkout/route.ts');
    expect(checkout).toContain(".select('profile_completed,active_company_id')");
    expect(checkout).toContain(".select('stripe_customer_id,razon_social,cif_nif,direccion,ciudad,codigo_postal,pais')");
    expect(checkout).toContain('isCompanyBillingReady(company)');
    expect(checkout).toContain("code: 'billing_required'");
    expect(checkout).toContain("code: 'company_required'");
    expect(checkout).toContain(".eq('company_id', companyId)");
    expect(checkout).toContain('await stripe.checkout.sessions.expire(session.id)');
    expect(checkout).toContain('company_id: companyId');
    expect(checkout).not.toContain('profile.billing_ready');
    expect(checkout).not.toContain("company_id: companyId ?? ''");
    expect(checkout).not.toContain("code: 'holded_required'");
  });

  it('admin subscription invite applies the same entity prerequisites', () => {
    const adminInvite = source('app/api/admin/subscriptions/send-link/route.ts');
    expect(adminInvite).toContain("code: 'billing_required'");
    expect(adminInvite).toContain("code: 'company_required'");
    expect(adminInvite).not.toContain("code: 'holded_required'");
    expect(adminInvite).toContain('await stripe.checkout.sessions.expire(session.id)');
    expect(adminInvite).toContain('company_id: companyId');
    expect(adminInvite).not.toContain("company_id: companyId ?? ''");
  });

  it('monthly plan guard scopes the contracting entity without requiring Holded', () => {
    const guard = source('lib/checkout/plan-mensual-guard.ts');
    expect(guard).toContain("reason: 'no_company'");
    expect(guard).toContain(".eq('company_id', profile.active_company_id)");
    expect(guard).not.toContain(".eq('provider', 'holded')");
    expect(guard).not.toContain("'no_holded'");
    expect(guard).not.toContain("'holded_error'");
  });

  it('adding a second entity does not overwrite legacy fiscal profile fields', () => {
    const onboarding = source('app/api/admin/users/invite/route.ts');
    expect(onboarding).toContain('if (isNewUser) {');
    expect(onboarding).toContain("code: 'tax_id_conflict'");
    expect(onboarding).toContain('Revisión manual necesaria');
    expect(onboarding).toContain("action: isNewUser ? (mode === 'invite_email' ? 'user.invited' : 'user.created') : 'user.entity_onboarded'");
  });

  it('self-service company creation blocks global tax id conflicts and compensates partial writes', () => {
    const companies = source('app/api/companies/route.ts');
    expect(companies).toContain("code: 'tax_id_conflict'");
    expect(companies).toContain('Revisión manual necesaria');
    expect(companies).toContain("await admin.from('companies').delete().eq('id', company.id)");
    expect(companies).toContain("await admin.from('profile_companies').delete().eq('profile_id', user.id).eq('company_id', company.id)");
  });

  it('one-off quotes carry company context and derived records inherit it', () => {
    const migration = source('supabase/migrations/20260903190000_entity_scoped_subscriptions.sql');
    const quotes = source('app/api/admin/quotes/route.ts');
    expect(migration).toContain('alter table public.quotes');
    expect(migration).toContain('add column if not exists company_id uuid');
    expect(migration).toContain('orders_inherit_quote_company');
    expect(migration).toContain('cases_inherit_quote_company');
    expect(migration).toContain('cases_company_id_fkey');
    expect(quotes).toContain('company_id: companyId');
    expect(quotes).toContain('quote_id: quote.id');
    expect(quotes).toContain("product_type: 'presupuesto'");
  });

  it('Holded retry keeps contracting company context', () => {
    const cron = source('app/api/cron/holded-sync/route.ts');
    expect(cron).toContain('companyId?: string | null');
    expect(cron).toContain(".select('razon_social,email')");
    expect(cron).toContain('manual review required');
  });

  it('company switcher checks PATCH response before refreshing', () => {
    const switcher = source('components/dashboard/CompanySwitcher.tsx');
    expect(switcher).toContain('if (!response.ok)');
    expect(switcher).toContain("setError(data?.error ?? 'No se pudo cambiar la entidad activa.')");
  });
});
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260908205500_harden_stripe_schema_function_search_paths.sql'),
  'utf8',
);

describe('Stripe schema function search_path hardening', () => {
  it('pins every function currently reported by Security Advisor', () => {
    expect(migration).toContain('ALTER FUNCTION stripe.set_updated_at()');
    expect(migration).toContain('ALTER FUNCTION stripe.set_updated_at_metadata()');
    expect(migration).toContain('ALTER FUNCTION stripe.check_rate_limit(text, integer, integer)');
    expect(migration.match(/SET search_path = pg_catalog, stripe;/g)?.length).toBe(3);
  });

  it('does not replace function bodies or change grants', () => {
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION');
    expect(migration).not.toMatch(/\bGRANT\b/);
    expect(migration).not.toMatch(/\bREVOKE\b/);
  });
});

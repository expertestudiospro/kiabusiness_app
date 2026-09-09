import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260908204000_kia_financial_reports_server_write.sql'),
  'utf8',
);

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('kia_financial_reports security boundary', () => {
  it('removes permissive browser write policies and grants', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "reports_service_insert"');
    expect(migration).toContain('DROP POLICY IF EXISTS "reports_service_update"');
    expect(migration).toContain('TO authenticated');
    expect(migration).toContain('USING (auth.uid() = client_id)');
    expect(migration).toContain('REVOKE ALL PRIVILEGES ON TABLE public.kia_financial_reports FROM anon');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER');
    expect(migration).toContain('GRANT SELECT ON TABLE public.kia_financial_reports TO authenticated');
  });

  it('keeps application writes on the server-side admin client', () => {
    const generator = source('lib/reports/report-generator.ts');
    const detailRoute = source('app/api/reports/[id]/route.ts');
    const listRoute = source('app/api/reports/route.ts');

    expect(generator).toContain(".from('kia_financial_reports')");
    expect(generator).toContain('.insert(');
    expect(generator).toContain('getSupabaseAdmin');

    expect(detailRoute).toContain('getSupabaseAdmin');
    expect(detailRoute).toContain('.update({ viewed_at:');
    expect(listRoute).toContain('getSupabaseAdmin');
  });

  it('does not reintroduce public write policies in the hardening migration', () => {
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*FOR INSERT[\s\S]*WITH CHECK \(true\)/);
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*FOR UPDATE[\s\S]*USING \(true\)/);
  });
});

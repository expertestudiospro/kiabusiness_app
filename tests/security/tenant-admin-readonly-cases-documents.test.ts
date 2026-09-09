import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260908204500_tenant_admin_readonly_cases_documents.sql'),
  'utf8',
);

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('tenant_admin cases/documents read-only hardening', () => {
  it('drops the stale FOR ALL policies and recreates SELECT-only policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "tenant_admin all cases"');
    expect(migration).toContain('DROP POLICY IF EXISTS "tenant_admin all documents"');
    expect(migration).toContain('CREATE POLICY "tenant_admin select cases"');
    expect(migration).toContain('CREATE POLICY "tenant_admin select documents"');
    expect(migration.match(/FOR SELECT/g)?.length).toBe(2);
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*FOR ALL/);
  });

  it('preserves the legitimate client document upload policy in the historical source', () => {
    const documentsSource = source('supabase/migrations/20260606000001_document_uploaded_by_role.sql');
    const tenantUpload = source('app/api/tenant/cases/[id]/documents/route.ts');

    expect(documentsSource).toContain('documents');
    expect(tenantUpload).toContain(".from('documents')");
    expect(tenantUpload).toContain('.insert({');
    expect(tenantUpload).toContain('getSupabaseAdmin');
  });

  it('keeps the current canonical migration intent read-only for tenant admins', () => {
    const canonical = source('supabase/migrations/20260607000001_rls_tenant_aware_phase2.sql');
    expect(canonical).toContain('tenant_admin puede leer expedientes de su tenant');
    expect(canonical).toContain('no crear/borrar');
    expect(canonical).toContain('tenant_admin puede leer documentos de clientes de su tenant');
  });
});

-- Restore the intended tenant_admin read-only boundary for cases/documents.
--
-- Production preflight 2026-09-08 confirmed stale permissive FOR ALL policies
-- that survived from an older application of the tenant-aware migration. The
-- current application and current migration source expect tenant_admin reads,
-- while controlled writes/uploads go through authenticated API routes using the
-- backend service-role client.
--
-- Forward-only repair. Do not apply until #143 has passed the isolated
-- migration-ledger staging checkpoint.

DROP POLICY IF EXISTS "tenant_admin all cases" ON public.cases;
DROP POLICY IF EXISTS "tenant_admin select cases" ON public.cases;

CREATE POLICY "tenant_admin select cases"
  ON public.cases
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_admin()
    AND tenant_id = public.auth_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_admin all documents" ON public.documents;
DROP POLICY IF EXISTS "tenant_admin select documents" ON public.documents;

CREATE POLICY "tenant_admin select documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_admin()
    AND client_id IN (
      SELECT id
      FROM public.profiles
      WHERE tenant_id = public.auth_tenant_id()
    )
  );

-- Deliberately do not revoke authenticated INSERT on documents here: clients
-- have a separate `client insert own documents` policy and that legitimate
-- upload path is outside the tenant_admin hardening scope.
-- Deliberately do not change broad table grants on cases in this migration:
-- RLS continues to gate non-admin callers, while grant cleanup needs a separate
-- complete inventory of every authenticated role/policy combination.

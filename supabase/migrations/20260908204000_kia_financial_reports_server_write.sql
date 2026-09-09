-- Harden public.kia_financial_reports.
--
-- Preflight 2026-09-08 confirmed that production currently grants anon and
-- authenticated broad table privileges while permissive INSERT/UPDATE policies
-- allow direct client writes. Application writes are performed through the
-- backend service-role client, so browser roles only need authenticated reads
-- of their own reports.
--
-- This is a forward-only hardening migration. Do not apply it until the
-- migration-ledger reconciliation tracked in #143 has passed the staging
-- checkpoint.

ALTER TABLE public.kia_financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_service_insert" ON public.kia_financial_reports;
DROP POLICY IF EXISTS "reports_service_update" ON public.kia_financial_reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.kia_financial_reports;

CREATE POLICY "reports_select_own"
  ON public.kia_financial_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- Anonymous users have no legitimate access to generated financial reports.
REVOKE ALL PRIVILEGES ON TABLE public.kia_financial_reports FROM anon;

-- Authenticated users may read only rows allowed by RLS. All writes remain
-- behind server-side/service-role APIs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.kia_financial_reports
  FROM authenticated;
GRANT SELECT ON TABLE public.kia_financial_reports TO authenticated;

-- Preserve explicit backend capability. service_role normally bypasses RLS,
-- but keeping the table grants explicit makes the intended trust boundary clear.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.kia_financial_reports
  TO service_role;

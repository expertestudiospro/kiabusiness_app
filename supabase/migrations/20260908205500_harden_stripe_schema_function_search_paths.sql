-- Pin search_path for the three remaining Stripe-schema functions reported by
-- Supabase Security Advisor on 2026-09-08.
--
-- Read-only preflight confirmed all referenced built-ins live in pg_catalog and
-- the rate-limit table is already schema-qualified as stripe._rate_limits.
-- No function body or privilege semantics are changed.
--
-- Forward-only hardening. Apply only after #143 passes the isolated Supabase
-- Development Branch/baseline checkpoint.

ALTER FUNCTION stripe.set_updated_at()
  SET search_path = pg_catalog, stripe;

ALTER FUNCTION stripe.set_updated_at_metadata()
  SET search_path = pg_catalog, stripe;

ALTER FUNCTION stripe.check_rate_limit(text, integer, integer)
  SET search_path = pg_catalog, stripe;

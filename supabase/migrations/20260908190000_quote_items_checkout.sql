-- Itemized quote checkout.
-- Prepared while production migration-ledger reconciliation (#143) remains open.
-- Do not apply ad hoc: deploy through the normal Supabase migration flow only.

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  service_slug text not null,
  stripe_price_id text not null,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_amount_eur numeric(10,2) not null check (unit_amount_eur >= 0),
  tax_behavior text not null default 'exclusive'
    check (tax_behavior in ('exclusive', 'inclusive', 'unspecified')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (quote_id, sort_order)
);

create index if not exists quote_items_quote_id_idx
  on public.quote_items(quote_id);

create index if not exists quote_items_service_slug_idx
  on public.quote_items(service_slug);

alter table public.quote_items enable row level security;

drop policy if exists "admin all quote items" on public.quote_items;
create policy "admin all quote items" on public.quote_items
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "client view own quote items" on public.quote_items;
create policy "client view own quote items" on public.quote_items
for select using (
  exists (
    select 1
    from public.quotes q
    where q.id = quote_items.quote_id
      and q.client_id = auth.uid()
  )
);

drop policy if exists "tenant_admin select quote items" on public.quote_items;
create policy "tenant_admin select quote items" on public.quote_items
for select using (
  public.is_tenant_admin()
  and exists (
    select 1
    from public.quotes q
    where q.id = quote_items.quote_id
      and q.tenant_id = public.auth_tenant_id()
  )
);

comment on table public.quote_items is
  'Server-resolved commercial lines for accepted quotes. Browser input must never be treated as the price source.';

comment on column public.quote_items.stripe_price_id is
  'Stripe Price resolved from the EXPERT catalog when the quote is created.';

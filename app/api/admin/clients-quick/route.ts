import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getSupabaseAdmin, listAllAuthUsers } from '@/lib/integrations/supabase';

// Lightweight client list for use in selectors/dropdowns.
// Returns client identity plus contracting companies so Admin can scope quotes safely.
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() ?? '';

  const [profilesRes, authRes, membershipsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, phone, active_company_id')
      .eq('role', 'client')
      .eq('status', 'active')
      .order('full_name', { ascending: true })
      .limit(200),
    listAllAuthUsers(),
    admin
      .from('profile_companies')
      .select('profile_id, company_id, company:companies(id,razon_social,cif_nif)')
      .limit(1000),
  ]);

  const authEmailById = new Map(authRes.map((u) => [u.id, u.email ?? '']));
  const companiesByProfile = new Map<string, Array<{ id: string; name: string; taxId: string | null }>>();

  for (const membership of membershipsRes.data ?? []) {
    const rawCompany = membership.company;
    const company = Array.isArray(rawCompany) ? rawCompany[0] : rawCompany;
    if (!company) continue;
    const existing = companiesByProfile.get(membership.profile_id) ?? [];
    existing.push({
      id: membership.company_id,
      name: company.razon_social ?? 'Entidad sin razón social',
      taxId: company.cif_nif ?? null,
    });
    companiesByProfile.set(membership.profile_id, existing);
  }

  const clients = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name ?? null,
    email: p.email ?? authEmailById.get(p.id) ?? '',
    phone: p.phone ?? null,
    activeCompanyId: p.active_company_id ?? null,
    companies: companiesByProfile.get(p.id) ?? [],
  })).filter((c) => c.email);

  const filtered = q
    ? clients.filter((c) =>
        (c.name ?? '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.companies.some((company) =>
          company.name.toLowerCase().includes(q) ||
          (company.taxId ?? '').toLowerCase().includes(q)
        )
      )
    : clients;

  return NextResponse.json({ clients: filtered.slice(0, 50) });
}

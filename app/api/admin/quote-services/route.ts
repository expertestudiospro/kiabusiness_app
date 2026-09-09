import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getSupabaseAdmin } from '@/lib/integrations/supabase';
import { listQuoteServices } from '@/lib/quotes/quote-items';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient(request);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'owner') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  return NextResponse.json({ services: listQuoteServices() });
}

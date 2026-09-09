import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/integrations/supabase';
import { checkRateLimit, checkSpam, getClientIp } from '@/lib/utils/spam-guard';
import { verifyRecaptchaToken } from '@/lib/utils/recaptcha';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').toLowerCase().trim();
    const name = String(body.name ?? '').trim() || null;
    const source = String(body.source ?? 'website').trim();
    const hp = String(body.hp_url ?? '');
    const recaptchaToken = String(body.recaptcha_token ?? '');

    // Honeypot: bots fill this, humans don't
    if (hp) return NextResponse.json({ ok: true });

    // Rate limit: max 5 requests per IP per hour
    const clientIp = getClientIp(request.headers);
    if (!checkRateLimit(`newsletter:${clientIp}`)) {
      return NextResponse.json({ ok: true }); // silent — don't reveal limit to bots
    }

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // Block disposable/temp email domains
    const spam = checkSpam({ email });
    if (spam.isSpam) {
      return NextResponse.json({ ok: true }); // silent — don't reveal detection
    }

    const recaptcha = await verifyRecaptchaToken({ token: recaptchaToken, action: 'newsletter' });
    if (!recaptcha.ok) {
      return NextResponse.json({ error: 'Verificación anti-spam fallida. Inténtalo de nuevo.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('newsletter_subscribers').upsert(
      { email, name, source },
      { onConflict: 'email', ignoreDuplicates: true }
    );

    if (error) {
      console.error('[newsletter]', error);
      return NextResponse.json({ error: 'No se pudo registrar el email.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[newsletter]', error);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}

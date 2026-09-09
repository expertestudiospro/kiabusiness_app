'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Phone, User } from 'lucide-react';

interface Props {
  priceIds: string[];
  onCheckoutUrl: (url: string) => void;
}

type ProfileResponse = { profile?: { full_name: string | null; phone: string | null } };
type CheckoutResponse = { url?: string; error?: string; requiresAuth?: boolean; code?: 'profile_required' };

const inputCls = 'w-full rounded-xl border border-[#D4A017]/20 bg-[#F8F6F1] px-3 py-2.5 text-sm text-[#0D1B2A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20';

export function QuickProfileGate({ priceIds, onCheckoutUrl }: Props) {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json() as ProfileResponse;
        if (!cancelled) {
          setFullName(data.profile?.full_name ?? '');
          setPhone(data.profile?.phone ?? '');
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canSave = useMemo(() => Boolean(fullName.trim() && phone.trim()), [fullName, phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saveRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() }),
      });
      const saveData = await saveRes.json() as { error?: string };
      if (!saveRes.ok) throw new Error(saveData.error ?? 'No hemos podido guardar tus datos.');

      const checkoutRes = await fetch('/api/services/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceIds }),
      });
      const checkoutData = await checkoutRes.json() as CheckoutResponse;
      if (checkoutRes.status === 401 || checkoutData.requiresAuth) {
        window.location.href = '/auth/login?next=/carrito';
        return;
      }
      if (checkoutData.url) {
        onCheckoutUrl(checkoutData.url);
        return;
      }
      setError(checkoutData.error ?? 'No hemos podido iniciar el pago.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hemos podido guardar tus datos. Intentalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#D4A017]/30 bg-[#F8F6F1] p-4">
      <p className="text-xs font-semibold text-[#0D1B2A]">Antes de pagar, confirma tu nombre y telefono</p>
      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#23364D]/60">
          <User className="h-3.5 w-3.5 text-[#D4A017]" /> Nombre completo
        </span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loadingProfile} className={inputCls} placeholder="Tu nombre completo" />
      </label>
      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#23364D]/60">
          <Phone className="h-3.5 w-3.5 text-[#D4A017]" /> Telefono
        </span>
        <input type="tel" inputMode="tel" pattern="[+]?[0-9\s().-]{7,20}" title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={loadingProfile} className={inputCls} placeholder="+34 6XX XXX XXX" />
      </label>
      {error && <p role="alert" aria-live="assertive" className="text-xs font-semibold text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving || loadingProfile || !canSave}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4A017] py-2.5 text-sm font-bold text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {saving ? 'Guardando...' : 'Guardar y pagar'}
        {!saving && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

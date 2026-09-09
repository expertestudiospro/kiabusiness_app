'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRecaptchaSiteKey, getRecaptchaToken } from '@/lib/utils/recaptcha-client';

const AREAS = [
  'Fiscalidad',
  'Extranjería y nacionalidad',
  'Empresas y autónomos',
  'Holded',
  'Certificado digital',
  'Tráfico y capitanía marítima',
  'Notaría y propiedades',
  'Planes de suscripción',
  'Otro'
];

const inputCls = 'mt-1.5 w-full border border-[#D4A017]/25 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/10';
const labelCls = 'block text-sm font-semibold text-[#0D1B2A]';

export function ContactForm() {
  const router = useRouter();
  const recaptchaEnabled = Boolean(getRecaptchaSiteKey());
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '', hp_url: '' });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.hp_url) { router.push('/gracias/contacto'); return; }
    setStatus('loading');
    setError('');
    try {
      const recaptcha_token = await getRecaptchaToken('contact');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptcha_token })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al enviar.'); setStatus('error'); return; }
      router.push('/gracias/contacto');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {error && (
        <div role="alert" aria-live="assertive" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Honeypot */}
      <input
        type="text"
        name="hp_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.hp_url}
        onChange={(e) => set('hp_url', e.target.value)}
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Nombre *</label>
          <input required value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Teléfono / WhatsApp</label>
        <input type="tel" inputMode="tel" pattern="[+]?[0-9\s().-]{7,20}" title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+34 600 000 000" className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>¿Sobre qué necesitas ayuda?</label>
        <select value={form.asunto} onChange={(e) => set('asunto', e.target.value)} className={inputCls}>
          <option value="">— Selecciona un área —</option>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>

      <div>
        <label className={labelCls}>Mensaje *</label>
        <textarea required rows={5} value={form.mensaje} onChange={(e) => set('mensaje', e.target.value)} placeholder="Cuéntanos brevemente tu situación o consulta..." className={inputCls} />
      </div>

      <p className="text-xs text-[#9CA3AF]">
        Al enviar aceptas nuestra{' '}
        <Link href="/privacidad" className="text-[#D4A017] hover:text-[#F2C14E]">Política de privacidad</Link>.
        {recaptchaEnabled && ' Este formulario está protegido por reCAPTCHA.'}
      </p>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-12 w-full items-center justify-center bg-[#0D1B2A] px-6 text-sm font-bold uppercase tracking-wide text-[#F8F6F1] transition hover:bg-[#23364D] disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {status === 'loading' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
}

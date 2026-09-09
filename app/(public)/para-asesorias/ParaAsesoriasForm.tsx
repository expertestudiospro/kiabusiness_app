'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';

const inputClass =
  'mt-1.5 w-full rounded-md border border-[#D4A017]/25 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/10';
const labelClass = 'block text-sm font-semibold text-[#0D1B2A]';

const clientRanges = [
  'Menos de 25 clientes',
  '25-75 clientes',
  '75-150 clientes',
  '150-300 clientes',
  'Más de 300 clientes',
  'Prefiero comentarlo'
];

const pilotOptions = [
  'Quiero participar en el piloto',
  'Quiero recibir información',
  'Quiero una demo cuando esté lista'
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  clientCountRange: string;
  currentTools: string;
  operationalProblem: string;
  pilotInterest: string;
  consent: boolean;
  hp_url: string;
};

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  clientCountRange: '',
  currentTools: '',
  operationalProblem: '',
  pilotInterest: pilotOptions[0],
  consent: false,
  hp_url: ''
};

export function ParaAsesoriasForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (form.hp_url) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const recaptcha_token = await getRecaptchaToken('saas_lead');
      const response = await fetch('/api/saas-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'para-asesorias', recaptcha_token })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'No se pudo enviar la solicitud.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setForm(initialState);
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-6 text-[#0D1B2A]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="font-serif text-xl font-bold">Solicitud recibida</h3>
            <p className="mt-2 text-sm leading-7 text-[#23364D]">
              Gracias por tu interés. Revisaremos tu caso y te responderemos con los siguientes pasos del piloto.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#0D1B2A] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1] transition hover:bg-[#23364D]"
            >
              Enviar otra solicitud
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div role="alert" aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <input
        type="text"
        name="hp_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.hp_url}
        onChange={(event) => setField('hp_url', event.target.value)}
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre *</label>
          <input
            required
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            className={inputClass}
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            className={inputClass}
            placeholder="tu@email.com"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Empresa o despacho *</label>
          <input
            required
            value={form.companyName}
            onChange={(event) => setField('companyName', event.target.value)}
            className={inputClass}
            placeholder="Nombre del despacho"
          />
        </div>
        <div>
          <label className={labelClass}>Teléfono / WhatsApp</label>
          <input
            type="tel"
            inputMode="tel"
            pattern="[+]?[0-9\s().-]{7,20}"
            title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)"
            value={form.phone}
            onChange={(event) => setField('phone', event.target.value)}
            className={inputClass}
            placeholder="+34 600 000 000"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Número aproximado de clientes *</label>
          <select
            required
            value={form.clientCountRange}
            onChange={(event) => setField('clientCountRange', event.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona una opción</option>
            {clientRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Interés en piloto *</label>
          <select
            required
            value={form.pilotInterest}
            onChange={(event) => setField('pilotInterest', event.target.value)}
            className={inputClass}
          >
            {pilotOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Herramientas actuales</label>
        <textarea
          rows={3}
          value={form.currentTools}
          onChange={(event) => setField('currentTools', event.target.value)}
          className={inputClass}
          placeholder="Holded, Excel, Google Drive, WhatsApp, email, CRM..."
        />
      </div>

      <div>
        <label className={labelClass}>Principal problema operativo *</label>
        <textarea
          required
          rows={5}
          value={form.operationalProblem}
          onChange={(event) => setField('operationalProblem', event.target.value)}
          className={inputClass}
          placeholder="Cuéntanos qué proceso te consume más tiempo o genera más bloqueo."
        />
      </div>

      <label className="flex gap-3 text-xs leading-6 text-[#23364D]">
        <input
          required
          type="checkbox"
          checked={form.consent}
          onChange={(event) => setField('consent', event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[#D4A017]/40 text-[#D4A017]"
        />
        <span>
          Acepto que EXPERT trate mis datos para responder a esta solicitud y contactar conmigo sobre el piloto. He leído la{' '}
          <Link href="/privacidad" className="font-semibold text-[#D4A017] hover:text-[#F2C14E]">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:opacity-60 sm:w-auto"
      >
        {status === 'loading' ? 'Enviando...' : 'Solicitar información'}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

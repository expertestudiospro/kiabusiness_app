'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2 } from 'lucide-react';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';

// ── Opciones del formulario ───────────────────────────────────────────────────

const SERVICES_OPTIONS = [
  {
    id: 'contabilidad',
    label: 'Contabilidad y libros contables',
    desc: 'Gestión completa de la contabilidad: asientos, cierres mensuales, balance y cuenta de resultados.'
  },
  {
    id: 'impuestos_trimestrales',
    label: 'Impuestos trimestrales',
    desc: 'IVA (Mod. 303), IRPF/retenciones (Mod. 111, 115), pagos fraccionados (Mod. 130/131).'
  },
  {
    id: 'impuesto_sociedades',
    label: 'Impuesto sobre Sociedades',
    desc: 'Preparación y presentación del Modelo 200 y obligaciones anuales de la empresa.'
  },
  {
    id: 'asesoria_fiscal',
    label: 'Asesoramiento fiscal estratégico',
    desc: 'Planificación fiscal, optimización de carga impositiva y consultas ilimitadas.'
  },
  {
    id: 'declaracion_renta',
    label: 'Declaración de la Renta (IRPF)',
    desc: 'Preparación y presentación de la renta anual de socios, administradores o empleados.'
  },
  {
    id: 'nominas',
    label: 'Gestión laboral y nóminas',
    desc: 'Altas/bajas en la Seguridad Social, nóminas mensuales, pagas extras y finiquitos.'
  },
  {
    id: 'extranjeria',
    label: 'Gestión de extranjería',
    desc: 'Autorizaciones de residencia y trabajo, renovaciones, arraigo y reagrupación familiar.'
  },
  {
    id: 'formacion',
    label: 'Formación en Holded',
    desc: 'Sesiones de formación para el equipo: uso de Holded, obligaciones fiscales o gestión laboral.'
  },
  {
    id: 'gestion_completa',
    label: 'Gestión completa delegada',
    desc: 'Todo lo anterior: contabilidad, impuestos, laboral, extranjería y asesoramiento continuo.'
  }
];

const COMPANY_TYPES = [
  'Autónomo / Freelance',
  'Sociedad Limitada (SL / SLU)',
  'Sociedad Anónima (SA)',
  'Comunidad de Bienes / Sociedad Civil',
  'Asociación / Fundación',
  'Otro'
];

const EMPLOYEES_OPTIONS = ['Solo yo (sin empleados)', '1 – 3', '4 – 10', '11 – 25', 'Más de 25'];

const BILLING_OPTIONS = [
  'Menos de 50.000 €/año',
  '50.000 – 150.000 €/año',
  '150.000 – 500.000 €/año',
  '500.000 – 1.000.000 €/año',
  'Más de 1.000.000 €/año',
  'Prefiero no indicarlo'
];

const SOFTWARE_OPTIONS = [
  'Ninguno (lo lleva mi gestoría)',
  'Excel / hojas de cálculo',
  'Holded (versión actual)',
  'Contaplus / SAGE',
  'A3 / Wolters Kluwer',
  'Otro software'
];

const URGENCY_OPTIONS = [
  'Inmediatamente (este mes)',
  'En los próximos 1-2 meses',
  'En los próximos 3-6 meses',
  'Solo estoy explorando opciones'
];

// ── Tipos ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  company_type: string;
  tax_id: string;
  employees: string;
  annual_billing: string;
  current_software: string;
  urgency: string;
  services: string[];
  message: string;
  hp_url: string;
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-[#0D1B2A]">
      {children} {required && <span className="text-[#D4A017]">*</span>}
    </label>
  );
}

const inputCls =
  'mt-1.5 w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none';

const selectCls =
  'mt-1.5 w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#D4A017] focus:outline-none';

// ── Página principal ──────────────────────────────────────────────────────────

export default function PresupuestoPersonalizadoPage() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    company_type: '',
    tax_id: '',
    employees: '',
    annual_billing: '',
    current_software: '',
    urgency: '',
    services: [],
    message: '',
    hp_url: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleField(k: keyof FormState, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function toggleService(id: string) {
    setForm((p) => ({
      ...p,
      services: p.services.includes(id)
        ? p.services.filter((s) => s !== id)
        : [...p.services, id]
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.services.length === 0) {
      setErrorMsg('Selecciona al menos un servicio que necesites.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const recaptcha_token = await getRecaptchaToken('advanced_quote');
      const res = await fetch('/api/presupuesto-avanzado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptcha_token })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('success');
      } else {
        setErrorMsg(data.error ?? 'Error al enviar. Inténtalo de nuevo.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Error de conexión. Inténtalo de nuevo.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen bg-[#F8F6F1] flex items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-[#D4A017]" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold text-[#0D1B2A]">¡Solicitud recibida!</h1>
          <p className="mt-4 text-base leading-7 text-[#23364D]">
            Hemos recibido tu solicitud de presupuesto. Analizaremos tus necesidades y te enviaremos
            una propuesta personalizada en <strong>24 horas hábiles</strong>.
          </p>
          <p className="mt-3 text-sm text-[#23364D]">
            Si necesitas hablar antes, escríbenos directamente a{' '}
            <a href="mailto:info@expertconsulting.es" className="font-semibold text-[#D4A017]">
              info@expertconsulting.es
            </a>
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/planes"
              className="inline-flex items-center gap-2 border border-[#0D1B2A]/20 px-6 py-3 text-sm font-semibold text-[#23364D] transition hover:border-[#D4A017]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a planes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F8F6F1] text-[#0D1B2A]">
      <div className="mx-auto max-w-4xl px-6 pt-5 pb-2">
        <Breadcrumb items={[
          { label: 'Planes', href: '/planes' },
          { label: 'Presupuesto personalizado' }
        ]} />
      </div>

      {/* Hero */}
      <section className="brand-blue-bg px-6 py-16 text-[#F8F6F1] md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-1.5">
            <ClipboardList className="h-4 w-4 text-[#D4A017]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4A017]">A medida</span>
          </div>
          <h1 className="mt-5 font-serif text-4xl font-bold leading-tight md:text-5xl">
            Presupuesto personalizado
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#9CA3AF]">
            Para empresas que necesitan más que un plan estándar: gestión laboral, nóminas,
            extranjería, asesoramiento estratégico o cobertura completa. Cuéntanos qué necesitas
            y en 24 horas hábiles tienes una propuesta ajustada a tu situación real.
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Honeypot */}
            <input type="text" name="hp_url" value={form.hp_url} onChange={(e) => handleField('hp_url', e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

            {/* Bloque 1: Datos de contacto */}
            <div>
              <div className="mb-6 border-b border-[#D4A017]/25 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">01 — Datos de contacto</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Nombre completo</FieldLabel>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleField('name', e.target.value)}
                    required
                    minLength={2}
                    placeholder="Tu nombre y apellidos"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel required>Email</FieldLabel>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleField('email', e.target.value)}
                    required
                    placeholder="tu@empresa.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel required>Teléfono</FieldLabel>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[+]?[0-9\s().-]{7,20}"
                    title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)"
                    value={form.phone}
                    onChange={(e) => handleField('phone', e.target.value)}
                    required
                    placeholder="+34 600 000 000"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Bloque 2: Datos de empresa */}
            <div>
              <div className="mb-6 border-b border-[#D4A017]/25 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">02 — Datos de la empresa</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Nombre de empresa o actividad</FieldLabel>
                  <input
                    type="text"
                    value={form.company_name}
                    onChange={(e) => handleField('company_name', e.target.value)}
                    required
                    minLength={2}
                    placeholder="Mi Empresa SL / Juan Pérez Autónomo"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Tipo de empresa</FieldLabel>
                  <select value={form.company_type} onChange={(e) => handleField('company_type', e.target.value)} className={selectCls}>
                    <option value="">Selecciona...</option>
                    {COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>CIF / NIF</FieldLabel>
                  <input
                    type="text"
                    value={form.tax_id}
                    onChange={(e) => handleField('tax_id', e.target.value)}
                    placeholder="B12345678 / 12345678A"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Número de empleados</FieldLabel>
                  <select value={form.employees} onChange={(e) => handleField('employees', e.target.value)} className={selectCls}>
                    <option value="">Selecciona...</option>
                    {EMPLOYEES_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Facturación anual aproximada</FieldLabel>
                  <select value={form.annual_billing} onChange={(e) => handleField('annual_billing', e.target.value)} className={selectCls}>
                    <option value="">Selecciona...</option>
                    {BILLING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>Software contable actual</FieldLabel>
                  <select value={form.current_software} onChange={(e) => handleField('current_software', e.target.value)} className={selectCls}>
                    <option value="">Selecciona...</option>
                    {SOFTWARE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>¿Cuándo quieres empezar?</FieldLabel>
                  <select value={form.urgency} onChange={(e) => handleField('urgency', e.target.value)} className={selectCls}>
                    <option value="">Selecciona...</option>
                    {URGENCY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Bloque 3: Servicios */}
            <div>
              <div className="mb-6 border-b border-[#D4A017]/25 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">03 — ¿Qué necesitas?</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">Selecciona todo lo que aplique a tu situación.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICES_OPTIONS.map(({ id, label, desc }) => {
                  const checked = form.services.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleService(id)}
                      className={`flex items-start gap-3 border p-4 text-left transition ${
                        checked
                          ? 'border-[#D4A017] bg-[#D4A017]/8'
                          : 'border-[#D4A017]/25 bg-white hover:border-[#D4A017]/50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                          checked ? 'border-[#D4A017] bg-[#D4A017]' : 'border-[#D4A017]/40'
                        }`}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#0D1B2A]">{label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[#9CA3AF]">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bloque 4: Mensaje */}
            <div>
              <div className="mb-6 border-b border-[#D4A017]/25 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">04 — Información adicional</p>
              </div>
              <div>
                <FieldLabel>¿Algo más que debamos saber?</FieldLabel>
                <textarea
                  value={form.message}
                  onChange={(e) => handleField('message', e.target.value)}
                  rows={5}
                  placeholder="Cuéntanos tu situación actual, dudas específicas, si tienes deudas con Hacienda, si estás al día en obligaciones, o cualquier otra cosa que nos ayude a preparar una propuesta más ajustada..."
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* Error */}
            {status === 'error' && (
              <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex w-full items-center justify-center gap-2 bg-[#D4A017] px-8 py-4 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:opacity-60"
            >
              {status === 'loading' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando solicitud...</>
              ) : (
                <><ClipboardList className="h-4 w-4" /> Solicitar presupuesto personalizado</>
              )}
            </button>

            <p className="text-center text-xs text-[#9CA3AF]">
              Recibirás respuesta en 24 horas hábiles. Sin compromiso. Tus datos están protegidos conforme al RGPD.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

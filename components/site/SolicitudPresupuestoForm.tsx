'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';
import { Breadcrumb } from '@/components/site/Breadcrumb';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';

const serviceCategories = [
  {
    id: 'impuestos',
    title: 'Fiscalidad',
    services: [
      { id: 'irpf', name: 'Declaración de la Renta (IRPF)', description: 'Declaración anual de renta personal' },
      { id: 'modelo151', name: 'Modelo 151 / Ley Beckham', description: 'Para trabajadores desplazados a España' },
      { id: 'noResidentes', name: 'Declaración de no residentes', description: 'IRNR y tributación para no residentes' }
    ]
  },
  {
    id: 'extranjeria',
    title: 'Extranjería y Nacionalidad',
    services: [
      { id: 'nacionalidad', name: 'Nacionalidad española', description: 'Proceso de nacionalización completo' },
      { id: 'residencias', name: 'Permisos de residencia', description: 'Residencia, arraigo, reagrupación familiar' },
      { id: 'renovaciones', name: 'Renovaciones y modificaciones', description: 'Renovación de TIE y otros documentos' }
    ]
  },
  {
    id: 'empresas',
    title: 'Empresas y Autónomos',
    services: [
      { id: 'alta-autonomos', name: 'Alta como autónomo', description: 'Constitución y registro como trabajador autónomo' },
      { id: 'constitucion', name: 'Constitución de empresa', description: 'Creación de SL, SA u otras formas societarias' },
      { id: 'contabilidad', name: 'Asesoría contable y fiscal', description: 'Contabilidad, impuestos y gestión empresarial' }
    ]
  }
];

export function SolicitudPresupuestoForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [hp, setHp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptcha_token = await getRecaptchaToken('quote_request');
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, services: selectedServices, description, hp_url: hp, recaptcha_token })
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
      }
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="bg-[#F8F6F1] text-[#0D1B2A]">
        <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center bg-[#D4A017]/15">
            <Check className="h-8 w-8 text-[#D4A017]" />
          </div>
          <h1 className="mt-6 font-serif text-3xl font-bold">¡Solicitud recibida!</h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#23364D]">
            Hemos recibido tu solicitud de presupuesto. Te contactaremos en las próximas 24 horas hábiles con una propuesta personalizada.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-[#F8F6F1] text-[#0D1B2A]">
      <div className="mx-auto max-w-3xl px-6 pt-5 pb-2">
        <Breadcrumb items={[{ label: 'Solicitar presupuesto' }]} />
      </div>

      <section className="brand-blue-bg px-6 py-12 text-[#F8F6F1]">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Presupuesto gratuito</p>
          <h1 className="mt-3 font-serif text-3xl font-bold md:text-4xl">Solicitar presupuesto</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#9CA3AF]">
            Rellena el formulario y recibirás una propuesta personalizada en menos de 24 horas hábiles. Sin compromiso.
          </p>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <input
              type="text"
              name="hp_url"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="absolute -left-[9999px] h-px w-px overflow-hidden"
            />

            {/* Datos personales */}
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0D1B2A]">Tus datos</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">
                    Nombre completo <span className="text-[#D4A017]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Tu nombre"
                    className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">
                    Email <span className="text-[#D4A017]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[+]?[0-9\s().-]{7,20}"
                    title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Servicios */}
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0D1B2A]">¿Qué necesitas?</h2>
              <p className="mt-1 text-sm text-[#23364D]">Selecciona uno o varios servicios.</p>
              <div className="mt-5 space-y-6">
                {serviceCategories.map((category) => (
                  <div key={category.id}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#D4A017]">{category.title}</p>
                    <div className="space-y-2">
                      {category.services.map((service) => {
                        const checked = selectedServices.includes(service.id);
                        return (
                          <label
                            key={service.id}
                            className={`flex cursor-pointer items-start gap-3 border p-4 transition ${
                              checked
                                ? 'border-[#D4A017] bg-[#D4A017]/5'
                                : 'border-[#D4A017]/25 bg-white hover:border-[#D4A017]/50'
                            }`}
                          >
                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
                              checked ? 'border-[#D4A017] bg-[#D4A017]' : 'border-[#D4A017]/40 bg-white'
                            }`}>
                              {checked && <Check className="h-3 w-3 text-[#0D1B2A]" strokeWidth={3} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleServiceToggle(service.id)}
                              className="sr-only"
                            />
                            <div>
                              <p className="text-sm font-semibold text-[#0D1B2A]">{service.name}</p>
                              <p className="text-xs text-[#9CA3AF]">{service.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h2 className="font-serif text-xl font-bold text-[#0D1B2A]">Cuéntanos más</h2>
              <p className="mt-1 text-sm text-[#23364D]">Cualquier detalle que nos ayude a preparar una propuesta más ajustada.</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe tu situación, plazos o cualquier detalle relevante..."
                className="mt-4 w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" aria-live="assertive" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <div className="border-t border-[#D4A017]/25 pt-6">
              <button
                type="submit"
                disabled={loading || !name || !email || selectedServices.length === 0}
                className="inline-flex min-h-12 w-full items-center justify-center bg-[#D4A017] px-8 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Solicitar presupuesto gratuito'}
              </button>
              <p className="mt-3 text-center text-xs text-[#9CA3AF]">
                Sin compromiso. Te responderemos en menos de 24 horas hábiles.
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

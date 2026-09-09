'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';
import { trackAcademyEvent } from '@/lib/utils/analytics';
import { countryDialCodes, DEFAULT_DIAL_CODE } from '@/lib/data/country-dial-codes';

// Combines a selected dial code with the raw phone input into one
// international-looking string. Handles two cases the naive
// `${dialCode} ${phone}` concatenation got wrong (flagged in review):
// - the user pastes an already-international number (starts with the
//   selected dial code, or any "+") — used as-is instead of duplicating
//   the prefix;
// - a domestic number with a leading trunk "0" (common outside Spain,
//   e.g. UK "07123...") — the leading 0 is dropped before prefixing.
function composePhoneNumber(dialCode: string, rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return trimmed;
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  const withoutTrunkZero = digitsOnly.replace(/^0+/, '');
  return `${dialCode}${withoutTrunkZero}`;
}

const STUDIES_OPTIONS = [
  'Educación secundaria / ESO',
  'Bachillerato',
  'Formación Profesional (FP)',
  'Grado universitario',
  'Máster / Posgrado',
  'Doctorado',
  'Otros',
];

const JOB_POSITION_OPTIONS = [
  'Administrativo/a',
  'Auxiliar administrativo/a',
  'Responsable de administración',
  'Office manager',
  'Recursos Humanos',
  'Responsable financiero/contable',
  'Gerente / Director/a',
  'Autónomo/a',
  'Empresario/a',
  'Desempleado/a en búsqueda activa',
  'Estudiante',
  'Otro',
];

export function AcademyLeadForm({
  programSlug,
  programName,
  hasOfficialCertification = true,
}: {
  programSlug: string;
  programName: string;
  /** Set to false for programs with no official-certification add-on (e.g. Gestión Laboral Integral) to hide that checkbox. */
  hasOfficialCertification?: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso2, setCountryIso2] = useState(DEFAULT_DIAL_CODE.iso2);
  const [phone, setPhone] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [studies, setStudies] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [experience, setExperience] = useState('');
  const [language, setLanguage] = useState<'es' | 'ru'>('es');
  const [certificationInterest, setCertificationInterest] = useState(false);
  const [hp, setHp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptcha_token = await getRecaptchaToken('academy_lead');
      const dialCode = countryDialCodes.find((c) => c.iso2 === countryIso2)?.dialCode ?? DEFAULT_DIAL_CODE.dialCode;
      const res = await fetch('/api/academy/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programSlug,
          name,
          email,
          phone: composePhoneNumber(dialCode, phone),
          currentRole,
          studies,
          companyName,
          experience,
          language,
          certificationInterest: hasOfficialCertification ? certificationInterest : false,
          hp_url: hp,
          recaptcha_token,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        trackAcademyEvent('course_lead_submit', { program_slug: programSlug, locale: language });
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
      <div className="flex flex-col items-center border border-[#D4A017]/25 bg-[#F8F6F1] px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center bg-[#D4A017]/15">
          <Check className="h-7 w-7 text-[#D4A017]" />
        </div>
        <h3 className="mt-5 font-serif text-2xl font-bold text-[#0D1B2A]">¡Solicitud recibida!</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#23364D]">
          Revisaremos tu perfil y te contactaremos en un plazo de 24 horas hábiles con toda la información sobre
          modalidad, calendario y requisitos de {programName}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border border-[#D4A017]/25 bg-white p-6 shadow-[0_4px_24px_rgba(13,27,42,0.07)]">
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

      <div className="grid gap-4 sm:grid-cols-2">
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
            aria-label="Nombre completo"
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
            aria-label="Email"
            className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">Teléfono</label>
          <div className="flex gap-2">
            <select
              value={countryIso2}
              onChange={(e) => setCountryIso2(e.target.value)}
              aria-label="Prefijo del país"
              className="w-[6.5rem] shrink-0 border border-[#D4A017]/30 bg-white px-2 py-3 text-sm text-[#0D1B2A] focus:border-[#D4A017] focus:outline-none"
            >
              {countryDialCodes.map((c) => (
                <option key={c.iso2} value={c.iso2}>{c.flag} {c.dialCode}</option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="tel"
              pattern="[0-9\s().-]{5,15}"
              title="Introduce un número de teléfono válido"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="600 000 000"
              aria-label="Teléfono"
              className="w-full min-w-0 border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">Puesto de trabajo</label>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            aria-label="Puesto de trabajo"
            className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#D4A017] focus:outline-none"
          >
            <option value="">Selecciona una opción</option>
            {JOB_POSITION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">Nivel de estudios</label>
          <select
            value={studies}
            onChange={(e) => setStudies(e.target.value)}
            aria-label="Nivel de estudios"
            className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] focus:border-[#D4A017] focus:outline-none"
          >
            <option value="">Selecciona una opción</option>
            {STUDIES_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">Nombre de empresa (opcional)</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Tu empresa"
            aria-label="Nombre de empresa"
            className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">
          Cuéntanos tu experiencia y tus objetivos
        </label>
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={3}
          placeholder="Experiencia profesional, motivo de interés en el programa..."
          aria-label="Experiencia y objetivos"
          className="w-full border border-[#D4A017]/30 bg-white px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#23364D]">Idioma preferido</label>
          <div className="flex gap-2">
            {(['es', 'ru'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`border px-4 py-2 text-sm font-semibold transition ${
                  language === lang
                    ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#0D1B2A]'
                    : 'border-[#D4A017]/30 text-[#23364D] hover:border-[#D4A017]'
                }`}
              >
                {lang === 'es' ? 'Español' : 'Русский'}
              </button>
            ))}
          </div>
        </div>
        {hasOfficialCertification && (
          <label className="flex items-center gap-2 text-sm text-[#23364D]">
            <input
              type="checkbox"
              checked={certificationInterest}
              onChange={(e) => setCertificationInterest(e.target.checked)}
              className="h-4 w-4 accent-[#D4A017]"
            />
            Me interesa la certificación oficial ADGD0210
          </label>
        )}
      </div>

      {error && (
        <p role="alert" aria-live="assertive" className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !name || !email}
        className="inline-flex min-h-12 w-full items-center justify-center bg-[#D4A017] px-8 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Solicitar información'}
      </button>
    </form>
  );
}

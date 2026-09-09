'use client';

import { useState, useCallback, Fragment } from 'react';
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle2, XCircle, AlertCircle, ShoppingCart, MessageSquare } from 'lucide-react';
import type { ViabilityCheck, VQuestion, VDoc } from '@/lib/data/viability-checks';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';

// ── Types ────────────────────────────────────────────────────────────────────

type DocStatus = 'have' | 'missing' | 'need_help';

interface ViabilityResponse {
  result: 'viable' | 'parcial' | 'no_viable';
  emoji: string;
  summary: string;
  met: string[];
  missing: string[];
  recommendations: string[];
  nextSteps: string[];
  escalate: boolean;
  stripePriceId: string | null;
  emailSent: boolean;
}

type Step = 'personal' | 'questions' | 'docs' | 'result';

interface PersonalData {
  name: string;
  email: string;
  phone: string;
  gdprConsent: boolean;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ViabilityModalProps {
  check: ViabilityCheck;
  serviceSlug: string;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDisqualified(q: VQuestion, answer: string | boolean | undefined): boolean {
  if (answer === undefined) return false;
  if (q.type === 'boolean') {
    if (q.disqualifiesIfFalse && answer === false) return true;
    if (q.disqualifiesIfTrue && answer === true) return true;
  }
  if (q.type === 'select' && typeof answer === 'string') {
    return q.options?.find(o => o.value === answer)?.disqualifies ?? false;
  }
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-[#D4A017] transition-all duration-300"
        style={{ width: `${Math.round((step / total) * 100)}%` }}
      />
    </div>
  );
}

function QuestionField({
  q,
  value,
  onChange
}: {
  q: VQuestion;
  value: string | boolean | undefined;
  onChange: (v: string | boolean) => void;
}) {
  if (q.type === 'boolean') {
    return (
      <div className="flex gap-3 mt-3">
        {['Sí', 'No'].map(label => {
          const boolVal = label === 'Sí';
          const selected = value === boolVal;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(boolVal)}
              className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition ${
                selected
                  ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#D4A017]'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'select' && q.options) {
    return (
      <div className="flex flex-col gap-2 mt-3">
        {q.options.map(opt => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full rounded-xl border px-4 py-3 text-sm font-medium text-left transition ${
                selected
                  ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#D4A017]'
                  : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === 'number') {
    return (
      <input
        type="number"
        value={typeof value === 'string' ? value : ''}
        onChange={e => onChange(e.target.value)}
        min={0}
        className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#D4A017] focus:outline-none"
        placeholder="Escribe un número…"
      />
    );
  }

  // text
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-[#D4A017] focus:outline-none"
      placeholder="Escribe tu respuesta…"
    />
  );
}

function DocField({
  doc,
  status,
  onChange
}: {
  doc: VDoc;
  status: DocStatus | undefined;
  onChange: (s: DocStatus) => void;
}) {
  const opts: { value: DocStatus; label: string }[] = [
    { value: 'have', label: 'Lo tengo' },
    { value: 'missing', label: 'No lo tengo' },
    { value: 'need_help', label: 'Necesito ayuda' }
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-white leading-snug flex-1">
          {doc.label}
          {doc.required && <span className="ml-1 text-xs text-[#D4A017]">*</span>}
        </span>
      </div>
      {doc.howToGet && (
        <p className="mt-1 text-xs text-white/50">{doc.howToGet}</p>
      )}
      <div className="mt-3 flex gap-2">
        {opts.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
              status === o.value
                ? 'border-[#D4A017] bg-[#D4A017]/15 text-[#D4A017]'
                : 'border-white/20 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultView({
  response,
  onClose
}: {
  response: ViabilityResponse;
  onClose: () => void;
}) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!response.stripePriceId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/services/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: response.stripePriceId })
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      setCheckoutError(data.error ?? 'No se pudo iniciar el pago.');
    } catch {
      setCheckoutError('No se pudo conectar con el servidor.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const config = {
    viable:    { color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle2,  text: 'VIABLE' },
    parcial:   { color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: AlertCircle,   text: 'VIABLE PARCIAL' },
    no_viable: { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', icon: XCircle,       text: 'NO VIABLE' }
  }[response.result];

  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Semáforo banner */}
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        style={{ background: config.bg, borderColor: config.border }}
      >
        <Icon className="h-7 w-7 shrink-0" style={{ color: config.color }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: config.color }}>
            {response.emoji} {config.text}
          </p>
          <p className="mt-0.5 text-sm" style={{ color: config.color }}>
            {response.summary}
          </p>
        </div>
      </div>

      {/* Met */}
      {response.met.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">Requisitos cumplidos</p>
          <ul className="flex flex-col gap-1">
            {response.met.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing */}
      {response.missing.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">Pendiente / no cumple</p>
          <ul className="flex flex-col gap-1">
            {response.missing.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {response.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">Recomendaciones</p>
          <ul className="flex flex-col gap-1 text-sm text-white/75 list-disc list-inside">
            {response.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Email notice */}
      {response.emailSent && (
        <p className="text-xs text-white/40 text-center">
          Hemos enviado este informe a tu correo electrónico.
        </p>
      )}

      {/* CTAs */}
      <div className="flex flex-col gap-3 pt-2">
        {response.stripePriceId && response.result !== 'no_viable' && (
          <>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A017] px-6 py-3 text-sm font-bold text-[#0D1B2A] shadow-md shadow-[#D4A017]/20 hover:bg-[#F2C14E] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {checkoutLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
              {checkoutLoading ? 'Redirigiendo…' : 'Contratar ahora'}
            </button>
            {checkoutError && (
              <p className="text-xs text-red-400 text-center">{checkoutError}</p>
            )}
          </>
        )}
        {(response.escalate || response.result === 'no_viable') && (
          <a
            href="/contacto"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            <MessageSquare className="h-4 w-4" />
            Hablar con un asesor
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-white/40 hover:text-white/60 transition text-center"
        >
          Cerrar
        </button>
      </div>

      <p className="text-[10px] text-white/25 text-center leading-relaxed">
        Este informe es orientativo y no constituye asesoramiento legal vinculante.
        Tus datos se tratan conforme al RGPD.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ViabilityModal({ check, serviceSlug, onClose }: ViabilityModalProps) {
  const [step, setStep] = useState<Step>('personal');
  const [qIndex, setQIndex] = useState(0);
  const [personal, setPersonal] = useState<PersonalData>({
    name: '', email: '', phone: '', gdprConsent: false
  });
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [docStatus, setDocStatus] = useState<Record<string, DocStatus>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ViabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 2 + check.questions.length + (check.docs.length > 0 ? 1 : 0);
  const currentStepNum =
    step === 'personal' ? 1 :
    step === 'questions' ? 2 + qIndex :
    step === 'docs' ? 2 + check.questions.length :
    totalSteps + 1;

  const currentQ: VQuestion | undefined = check.questions[qIndex];

  const canAdvancePersonal =
    personal.name.trim().length > 0 &&
    personal.email.includes('@') &&
    personal.gdprConsent;

  const canAdvanceQuestion = useCallback(() => {
    if (!currentQ) return true;
    if (!currentQ.required) return true;
    const ans = answers[currentQ.id];
    return ans !== undefined && ans !== '';
  }, [currentQ, answers]);

  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const recaptcha_token = await getRecaptchaToken('viability_check');
      const res = await fetch('/api/services/viabilidad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSlug,
          clientName: personal.name,
          clientEmail: personal.email,
          clientPhone: personal.phone || undefined,
          gdprConsent: personal.gdprConsent,
          answers,
          docStatus,
          recaptcha_token
        })
      });
      const data = await res.json() as ViabilityResponse & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? 'Error al evaluar. Inténtalo de nuevo.');
        return;
      }
      setResult(data);
      setStep('result');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [serviceSlug, personal, answers, docStatus]);

  const handleNext = useCallback(() => {
    if (step === 'personal') {
      setStep('questions');
      setQIndex(0);
      return;
    }
    if (step === 'questions') {
      if (qIndex < check.questions.length - 1) {
        setQIndex(i => i + 1);
      } else if (check.docs.length > 0) {
        setStep('docs');
      } else {
        submit();
      }
      return;
    }
    if (step === 'docs') {
      submit();
    }
  }, [step, qIndex, check, submit]);

  const handleBack = useCallback(() => {
    if (step === 'questions' && qIndex > 0) { setQIndex(i => i - 1); return; }
    if (step === 'questions' && qIndex === 0) { setStep('personal'); return; }
    if (step === 'docs') {
      if (check.questions.length > 0) { setStep('questions'); setQIndex(check.questions.length - 1); }
      else setStep('personal');
    }
  }, [step, qIndex, check]);

  const disqualifiedNow = step === 'questions' && currentQ
    ? isDisqualified(currentQ, answers[currentQ.id])
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0D1B2A] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0D1B2A] px-6 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#D4A017]">
                Evaluación de viabilidad
              </p>
              <h2 className="mt-0.5 text-base font-bold text-white leading-snug truncate">
                {check.serviceName}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar evaluación"
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {step !== 'result' && (
            <div className="mt-3">
              <ProgressBar step={currentStepNum} total={totalSteps} />
              <p className="mt-1 text-[10px] text-white/30">
                Paso {currentStepNum} de {totalSteps} · ~{check.estimatedMinutes} min
              </p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* ── Personal data step ── */}
          {step === 'personal' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/70">{check.intro}</p>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={personal.name}
                    onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#D4A017] focus:outline-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    value={personal.email}
                    onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#D4A017] focus:outline-none"
                    placeholder="nombre@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[+]?[0-9\s().-]{7,20}"
                    title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)"
                    value={personal.phone}
                    onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#D4A017] focus:outline-none"
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="mt-0.5 relative shrink-0">
                  <input
                    type="checkbox"
                    checked={personal.gdprConsent}
                    onChange={e => setPersonal(p => ({ ...p, gdprConsent: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition ${
                    personal.gdprConsent ? 'border-[#D4A017] bg-[#D4A017]' : 'border-white/30 bg-white/5'
                  }`}>
                    {personal.gdprConsent && (
                      <svg className="h-3 w-3 text-[#0D1B2A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-white/50 leading-relaxed">
                  Acepto que EXPERT ESTUDIOS PROFESIONALES trate mis datos para evaluar la viabilidad de mi caso,
                  conforme a la{' '}
                  <a href="/privacidad" className="text-[#D4A017] underline" target="_blank" rel="noopener noreferrer">
                    política de privacidad
                  </a>
                  . Puedo ejercer mis derechos RGPD en cualquier momento.
                </span>
              </label>
            </div>
          )}

          {/* ── Questions step ── */}
          {step === 'questions' && currentQ && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-white leading-snug">{currentQ.label}</p>
                {currentQ.hint && (
                  <p className="mt-1 text-xs text-white/45">{currentQ.hint}</p>
                )}
                <QuestionField
                  q={currentQ}
                  value={answers[currentQ.id]}
                  onChange={v => setAnswers(a => ({ ...a, [currentQ.id]: v }))}
                />
              </div>

              {disqualifiedNow && (
                <div className="flex items-start gap-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">
                    Esta respuesta indica que puede que no se cumplan los requisitos para este trámite.
                    Puedes continuar para obtener el informe completo.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Docs step ── */}
          {step === 'docs' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-white/70">
                Indica qué documentación tienes disponible:
              </p>
              {check.docs.map(doc => (
                <DocField
                  key={doc.id}
                  doc={doc}
                  status={docStatus[doc.id]}
                  onChange={s => setDocStatus(d => ({ ...d, [doc.id]: s }))}
                />
              ))}
            </div>
          )}

          {/* ── Result step ── */}
          {step === 'result' && result && (
            <ResultView
              response={result}
              onClose={onClose}
            />
          )}

          {/* ── Error ── */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {step !== 'result' && (
          <div className="sticky bottom-0 bg-[#0D1B2A] border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 'personal'}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5 disabled:invisible transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Atrás
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={
                loading ||
                (step === 'personal' && !canAdvancePersonal) ||
                (step === 'questions' && !canAdvanceQuestion())
              }
              className="flex items-center gap-2 rounded-xl bg-[#D4A017] px-5 py-2.5 text-sm font-bold text-[#0D1B2A] shadow-md shadow-[#D4A017]/20 hover:bg-[#F2C14E] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <Fragment>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Evaluando…
                </Fragment>
              ) : step === 'docs' || (step === 'questions' && qIndex === check.questions.length - 1 && check.docs.length === 0) ? (
                <Fragment>
                  Ver resultado
                  <ChevronRight className="h-4 w-4" />
                </Fragment>
              ) : (
                <Fragment>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Fragment>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

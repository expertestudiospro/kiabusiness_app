'use client';

import { useState } from 'react';
import { X, Mail, Check, Loader2 } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/utils/recaptcha-client';

interface Props {
  serviceName: string;
  label?: string;
  className?: string;
}

export function RequestProposalModal({ serviceName, label = 'Recibir propuesta por email', className }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [hp, setHp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptcha_token = await getRecaptchaToken('quote_request');
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, services: [serviceName], description, hp_url: hp, recaptcha_token }),
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

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setError('');
    }, 300);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Mail className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
          <div className="relative w-full max-w-md bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-4 top-4 text-[#9CA3AF] transition hover:text-[#0D1B2A]"
            >
              <X className="h-5 w-5" />
            </button>

            {submitted ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center bg-[#D4A017]/15">
                  <Check className="h-7 w-7 text-[#D4A017]" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-bold text-[#0D1B2A]">¡Solicitud recibida!</h3>
                <p className="mt-2 text-sm leading-6 text-[#23364D]">
                  Te enviaremos la propuesta de {serviceName} a tu email en menos de 24 horas hábiles.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">Propuesta sin compromiso</p>
                  <h3 className="mt-1 font-serif text-xl font-bold text-[#0D1B2A]">Recibir propuesta por email</h3>
                  <p className="mt-1 text-sm text-[#23364D]/70">{serviceName}</p>
                </div>

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

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nombre completo"
                  className="w-full border border-[#D4A017]/30 bg-[#F8F6F1] px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                  className="w-full border border-[#D4A017]/30 bg-[#F8F6F1] px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  pattern="[+]?[0-9\s().-]{7,20}"
                  title="Introduce un teléfono válido (7-20 dígitos, puede incluir +, espacios o guiones)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  className="w-full border border-[#D4A017]/30 bg-[#F8F6F1] px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Algo que debamos saber (opcional)"
                  className="w-full border border-[#D4A017]/30 bg-[#F8F6F1] px-4 py-3 text-sm text-[#0D1B2A] placeholder-[#9CA3AF] focus:border-[#D4A017] focus:outline-none"
                />

                {error && <p role="alert" aria-live="assertive" className="text-xs font-semibold text-red-700">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !name || !email}
                  className="flex w-full items-center justify-center gap-2 bg-[#D4A017] py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <p className="text-center text-xs text-[#9CA3AF]">
                  Sin compromiso. Respuesta en menos de 24 horas hábiles.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

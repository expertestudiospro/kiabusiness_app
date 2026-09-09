'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { getCalDemoUrl } from '@/lib/utils/cal';

// Configured via NEXT_PUBLIC_TELEGRAM_BOT_USERNAME (Vercel env var), e.g. "expertconsulting_bot".
// If unset, the widget falls back to the WhatsApp number rather than shipping a dead Telegram link.
const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || null;
const WA_NUMBER = '34669045528';
const SESSION_KEY = 'kia_bubble_dismissed';
// Proactive open is deliberately delayed (vs. the previous 5 s) so the bubble
// doesn't feel like it's ambushing a visitor who just landed on the page.
const AUTO_OPEN_DELAY_MS = 20000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 14)  return '¡Buenos días!';
  if (h >= 14 && h < 21) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

interface FiscalChip { icon: string; label: string; msg: string }

function getFiscalChip(): FiscalChip | null {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const year  = now.getFullYear();

  // IRPF campaign: 3 Apr – 30 Jun
  if ((month === 4 && day >= 3) || month === 5 || (month === 6 && day <= 30)) {
    return { icon: '📋', label: `Campaña Renta ${year - 1}`, msg: `Hola, quiero consultar sobre la Campaña de la Renta ${year - 1}.` };
  }
  // Modelo 720: Jan–Mar
  if (month <= 3) {
    const daysLeft = Math.round((new Date(year, 2, 31).getTime() - now.getTime()) / 86400000);
    if (daysLeft <= 15) {
      return { icon: '⚠️', label: `M720 — ${daysLeft} días`, msg: 'Hola, necesito ayuda urgente con el Modelo 720 (bienes en el extranjero).' };
    }
    return { icon: '🌍', label: 'Modelo 720', msg: 'Hola, tengo bienes o cuentas en el extranjero y quiero saber si tengo que presentar el M720.' };
  }
  // Quarterly VAT: Q1 1–20 Apr, Q2 1–20 Jul, Q3 1–20 Oct
  if ((month === 4 && day <= 2) || (month === 7 && day <= 20) || (month === 10 && day <= 20)) {
    return { icon: '📊', label: 'Impuestos trimestrales', msg: 'Hola, necesito ayuda con las declaraciones trimestrales de IVA e IRPF.' };
  }
  // Q4 / year-end
  if (month >= 11) {
    return { icon: '📅', label: `Planificación fiscal ${year + 1}`, msg: `Hola, quiero revisar mi situación fiscal antes de que acabe el año y planificar ${year + 1}.` };
  }
  return null;
}

/** Telegram deep link — opens a chat with the bot and pre-fills the compose box. */
function buildTelegramUrl(msg: string) {
  return `https://t.me/${TELEGRAM_BOT}?text=${encodeURIComponent(msg)}`;
}

function buildWaUrl(msg: string) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/** Builds the deep link for the active channel (Telegram if configured, WhatsApp as fallback). */
function buildChannelUrl(msg: string) {
  return TELEGRAM_BOT ? buildTelegramUrl(msg) : buildWaUrl(msg);
}

// ── Quick-reply action types ──────────────────────────────────────────────────

const CAL_DEMO = getCalDemoUrl();

type Action =
  | { kind: 'link';    href: string; label: string; icon: string; external?: true }
  | { kind: 'channel'; msg:  string; label: string; icon: string }
  | { kind: 'cal';     url:  string | null; label: string; icon: string };

const ANON_BASE: Action[] = [
  { kind: 'link',    href: '/servicios',  label: 'Ver catálogo',       icon: '📋' },
  { kind: 'cal',     url: CAL_DEMO, label: 'Reservar demo Holded', icon: '📅' },
  { kind: 'channel', msg: 'Hola, tengo una consulta fiscal.', label: 'Consulta fiscal', icon: '💬' },
];

const USER_BASE: Action[] = [
  { kind: 'link',    href: '/dashboard/expedientes', label: 'Mis expedientes',    icon: '📁' },
  { kind: 'channel', msg: 'Hola, soy cliente de EXPERT. Tengo una duda sobre mi expediente.', label: 'Duda sobre mi caso', icon: '💬' },
  { kind: 'link',    href: '/servicios',             label: 'Ver catálogo',       icon: '📋' },
];

function buildActions(loggedIn: boolean, chip: FiscalChip | null): Action[] {
  const base = [...(loggedIn ? USER_BASE : ANON_BASE)];
  if (chip) base.push({ kind: 'channel', msg: chip.msg, label: chip.label, icon: chip.icon });
  return base;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TelegramChatWidget() {
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [dismissed,  setDismissed]  = useState(false);
  const [greeting,   setGreeting]   = useState('¡Hola!');
  const [fiscalChip, setFiscalChip] = useState<FiscalChip | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName,   setUserName]   = useState<string | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGreeting(getGreeting()); // eslint-disable-line react-hooks/set-state-in-effect
    setFiscalChip(getFiscalChip());

    if (sessionStorage.getItem(SESSION_KEY)) {
      setDismissed(true);
      return;
    }

    // Auth detection — session cache, no network round-trip
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setIsLoggedIn(true);
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          const first = data?.full_name?.split(' ')[0];
          if (first) setUserName(first);
        });
    });

    // Auto-show on desktop, deliberately delayed (see AUTO_OPEN_DELAY_MS) so
    // it reads as a proactive nudge rather than an ambush on page load.
    if (window.innerWidth >= 768) {
      timerRef.current = setTimeout(() => setBubbleOpen(true), AUTO_OPEN_DELAY_MS);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!bubbleOpen) return;
    function handler(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setBubbleOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bubbleOpen]);

  const dismiss     = useCallback(() => {
    setBubbleOpen(false);
    setDismissed(true);
    sessionStorage.setItem(SESSION_KEY, '1');
  }, []);
  const toggleBubble = useCallback(() => setBubbleOpen(v => !v), []);

  const channelName = TELEGRAM_BOT ? 'Telegram' : 'WhatsApp';

  const greetingBody = isLoggedIn
    ? userName
      ? `Bienvenido/a, ${userName} 😊 ¿En qué podemos ayudarte hoy?`
      : 'Bienvenido/a de nuevo a EXPERT 😊 ¿En qué podemos ayudarte hoy?'
    : `Escríbenos por ${channelName} y te ayudamos con tu consulta de fiscalidad, extranjería o empresa. Respondemos en horario laboral.`;

  const actions = buildActions(isLoggedIn, fiscalChip);

  const fallbackUrl = buildChannelUrl(
    isLoggedIn
      ? 'Hola, soy cliente de EXPERT. ¿Podéis ayudarme?'
      : 'Hola, me gustaría obtener información sobre los servicios de EXPERT.',
  );

  return (
    <div ref={bubbleRef} className="relative flex flex-col items-end">

      {/* ── Popup bubble — absolute so it floats above the button without
           pushing it down, and is invisible/inert when closed ─────────── */}
      <div
        className={[
          'absolute bottom-full right-0 mb-3 w-72 rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#D4A017]/20 overflow-hidden',
          'transition-all duration-300 origin-bottom-right',
          bubbleOpen && !dismissed
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-2 pointer-events-none invisible',
        ].join(' ')}
        {...((!bubbleOpen || dismissed) ? { 'aria-hidden': 'true' } : {})}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-[#0D1B2A] px-4 py-3">
          <div className="relative h-10 w-10 shrink-0">
            <Image src="/branding/kia_bot.png" alt="EXPERT" fill className="rounded-full object-cover" sizes="40px" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white leading-none">EXPERT</p>
            <p className="mt-0.5 text-xs text-white/55">Escríbenos por {channelName}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1 text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pt-4 pb-2 space-y-3">
          {/* Greeting bubble */}
          <div className="rounded-2xl rounded-tl-none bg-[#F8F6F1] px-3.5 py-2.5 text-sm text-[#0D1B2A] leading-relaxed">
            <span className="font-semibold">{greeting}</span>{' '}{greetingBody}
          </div>

          {/* Quick-reply chips */}
          <div className="flex flex-col gap-1.5">
            {actions.map(action => {
              const chipClass = 'flex w-full items-center gap-2.5 rounded-xl border border-[#D4A017]/30 bg-white px-3.5 py-2 text-left text-xs font-semibold text-[#0D1B2A] transition hover:border-[#D4A017] hover:bg-[#D4A017]/5';
              if (action.kind === 'link') return (
                <Link
                  key={action.label}
                  href={action.href}
                  target={action.external ? '_blank' : undefined}
                  rel={action.external ? 'noopener noreferrer' : undefined}
                  onClick={dismiss}
                  className={chipClass}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {action.label}
                </Link>
              );
              if (action.kind === 'cal') return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    if (action.url && window.Cal) {
                      const calLink = (() => { try { return new URL(action.url).pathname.slice(1); } catch { return action.url; } })();
                      window.Cal('modal', { calLink, config: { layout: 'month_view' } });
                    } else {
                      window.location.assign('/cita');
                    }
                    dismiss();
                  }}
                  className={chipClass}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {action.label}
                </button>
              );
              return (
                <a
                  key={action.label}
                  href={buildChannelUrl(action.msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  className={chipClass}
                >
                  <span aria-hidden="true">{action.icon}</span>
                  {action.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer — direct channel fallback */}
        <div className="px-4 pb-3 pt-2 space-y-2">
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#26A5E4] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e8fc9] transition-colors"
          >
            <ChannelIcon className="h-4 w-4" />
            Escríbenos por {channelName}
          </a>
        </div>
      </div>

      {/* ── Floating avatar button ────────────────────────────────────────── */}
      {(!bubbleOpen || dismissed) && (
        dismissed ? (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Escríbenos por ${channelName}`}
            title={`Escríbenos por ${channelName}`}
            className="group relative h-14 w-14 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.22)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#26A5E4]/30 overflow-visible"
          >
            <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-[#D4A017]/60 group-hover:ring-[#D4A017]">
              <Image src="/branding/kia_bot.png" alt="EXPERT" fill className="object-cover" sizes="56px" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#26A5E4] border-2 border-white shadow-sm" aria-hidden="true">
              <ChannelIcon className="h-3 w-3" />
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={toggleBubble}
            aria-label={`Escríbenos por ${channelName}`}
            title={`Escríbenos por ${channelName}`}
            className="group relative h-14 w-14 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.22)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#26A5E4]/30 overflow-visible"
          >
            <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-[#D4A017]/60 group-hover:ring-[#D4A017] transition-all">
              <Image src="/branding/kia_bot.png" alt="EXPERT" fill className="object-cover" sizes="56px" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#26A5E4] border-2 border-white shadow-sm" aria-hidden="true">
              <ChannelIcon className="h-3 w-3" />
            </span>
            <span className="absolute inset-0 rounded-full border-2 border-[#26A5E4]/50 animate-ping" aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
}

function ChannelIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  if (!TELEGRAM_BOT) {
    // WhatsApp glyph — fallback channel while no Telegram bot is configured.
    return (
      <svg viewBox="0 0 24 24" className={`${className} fill-white`} aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    );
  }
  // Telegram paper-plane glyph.
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-white`} aria-hidden="true">
      <path d="M22.05 2.94a1.6 1.6 0 00-1.64-.27L1.62 10.14a1.53 1.53 0 00.12 2.87l4.74 1.53 1.83 5.9a1.02 1.02 0 001.7.41l2.65-2.53 4.63 3.42a1.53 1.53 0 002.4-.93l3.4-16.02a1.53 1.53 0 00-.9-1.85zM9.6 14.7l-1.2 3.86-1.1-3.56 10.5-8.15c.2-.15.42.1.25.28L9.6 14.7z" />
    </svg>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Calendar } from 'lucide-react';
import { CalendlyButton } from '@/components/site/CalendlyButton';
import { getCalMeetingUrl } from '@/lib/utils/cal';

const CAL_REUNION_URL = getCalMeetingUrl();

const quickLinks = [
  { label: 'Inicio', href: '/' },
  { label: 'Planes', href: '/planes' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Holded', href: '/holded' },
  { label: 'Nosotros', href: '/sobre-mi' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Para asesorías', href: '/para-asesorias' }
] as const;

const serviceLinks = [
  { label: 'Fiscalidad', href: '/servicios/declaraciones-impuestos' },
  { label: 'Extranjería y Nacionalidad', href: '/servicios/extranjeria-nacionalidad' },
  { label: 'Empresas y Autónomos', href: '/servicios/empresas-autonomos' },
  { label: 'Holded', href: '/holded' },
  { label: 'Certificado digital', href: '/servicios/certificado-digital' },
  { label: 'Tráfico y Capitanía Marítima', href: '/servicios/trafico-capitania-maritima' },
  { label: 'Notaría y Propiedades', href: '/servicios/notaria-propiedades' }
] as const;

const resourceLinks = [
  { label: 'Base de conocimientos', href: '/docs' },
  { label: 'Nacionalidad menor nacido en España', href: '/docs/nacionalidad-espanola-menor-nacido-en-espana' },
  { label: 'Residencia legal del menor', href: '/docs/residencia-legal-menor-nacido-espana-nacionalidad' },
  { label: 'Documentos para el expediente', href: '/docs/documentos-nacionalidad-menor-nacido-espana' }
] as const;

const socialLinks = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/ksenia-ilicheva/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/expert_servicios/',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    )
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/expertapp',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    )
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/channel/UCua-wKjSBBVOuIXI-wWzpJg',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  }
] as const;

export function Footer() {
  return (
    <footer className="bg-[#0D1B2A] py-10 text-[#F8F6F1]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-9 px-6 md:grid-cols-2 lg:grid-cols-[1.15fr_0.72fr_0.95fr_0.95fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <Image
              src="/logos/EXPERT_logo/expert-logo-light-clean.png"
              alt="Logo EXPERT"
              width={220}
              height={64}
              className="object-contain"
            />
          </Link>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">
              Holded Solution Partner certificado
            </p>
            <Image
              src="/Holded-Logotype-Red_Light.svg"
              alt="Holded"
              width={128}
              height={32}
              className="h-8 w-auto opacity-90"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]">Navegación</h3>
          <ul className="space-y-2 text-sm text-[#9CA3AF]">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-[#D4A017]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]">Servicios</h3>
          <ul className="space-y-2 text-sm text-[#9CA3AF]">
            {serviceLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-[#D4A017]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]">Guías</h3>
          <ul className="space-y-2 text-sm text-[#9CA3AF]">
            {resourceLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-[#D4A017]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]">Contacto</h3>
          <ul className="space-y-3 text-sm text-[#9CA3AF]">
            <li className="flex gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
              <a href="tel:+34669045528" className="transition hover:text-[#D4A017]">+34 669 04 55 28</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
              <a href="mailto:info@expertconsulting.es" className="transition hover:text-[#D4A017]">info@expertconsulting.es</a>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
              <span>España</span>
            </li>
          </ul>

          <div className="mt-5 flex gap-2">
            {socialLinks.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-white/15 text-[#9CA3AF] transition hover:border-[#D4A017] hover:text-[#D4A017]"
              >
                {icon}
              </a>
            ))}
          </div>

          <CalendlyButton
            url={CAL_REUNION_URL}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-[#D4A017]/50 px-4 py-2.5 text-sm font-semibold text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017]/10"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            Programar una reunión
          </CalendlyButton>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-6xl flex-col justify-between gap-4 border-t border-[#D4A017]/30 px-6 pt-5 text-xs text-[#9CA3AF] md:flex-row">
        <p>
          © 2026 EXPERT | Todos los derechos reservados.{' '}
          <span className="opacity-60">
            Protegido por reCAPTCHA —{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4A017] transition">Privacidad</a>
            {' '}·{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4A017] transition">Términos</a>
          </span>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/aviso-legal" className="transition hover:text-[#D4A017]">Aviso legal</Link>
          <Link href="/privacidad" className="transition hover:text-[#D4A017]">Privacidad</Link>
          <Link href="/terminos" className="transition hover:text-[#D4A017]">Términos</Link>
          <Link href="/cookies" className="transition hover:text-[#D4A017]">Cookies</Link>
          <Link href="/condiciones" className="transition hover:text-[#D4A017]">Condiciones</Link>
        </div>
      </div>
    </footer>
  );
}

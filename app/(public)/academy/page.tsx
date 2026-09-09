import type { Metadata } from 'next';
import { Check, Clock, Globe, Award, Download, CalendarCheck } from 'lucide-react';
import { academyPrograms } from '@/lib/data/academy-catalog';
import { AcademyLeadForm } from '@/components/site/AcademyLeadForm';
import { AcademyCheckoutButton } from '@/components/site/AcademyCheckoutButton';
import { CalendlyButton } from '@/components/site/CalendlyButton';
import { FaqSection } from '@/components/site/FaqSection';
import { getCalAcademyUrl } from '@/lib/utils/cal';
import { EventTracker } from '@/components/site/EventTracker';
import { TrackedAnchor } from '@/components/site/TrackedAnchor';
import { OtherAcademyPrograms } from '@/components/site/OtherAcademyPrograms';

const program = academyPrograms[0];

export const metadata: Metadata = {
  title: program.metaTitle,
  description: program.metaDescription,
  alternates: { canonical: 'https://expertconsulting.es/academy' },
  openGraph: {
    type: 'website',
    url: 'https://expertconsulting.es/academy',
    title: program.metaTitle,
    description: program.metaDescription,
    siteName: 'EXPERT — Asesoría Fiscal y Legal',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: program.metaTitle,
    description: program.metaDescription,
  },
};

// Spanish formatting: "." is a thousands separator, "," is the decimal mark
// (e.g. "2.950 €" -> "2950", "1.200 €" -> "1200"). Strip dots before commas
// or a naive digit-group regex truncates thousands-separated prices.
const priceValue = program.price.match(/[\d.,]+/)?.[0]?.replace(/\./g, '').replace(',', '.');

const courseJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: program.name,
  description: program.metaDescription,
  provider: {
    '@type': 'Organization',
    name: 'EXPERT',
    sameAs: 'https://expertconsulting.es',
  },
  url: 'https://expertconsulting.es/academy',
  ...(priceValue
    ? {
        offers: {
          '@type': 'Offer',
          price: priceValue,
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          url: 'https://expertconsulting.es/academy',
        },
      }
    : {}),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://expertconsulting.es' },
    { '@type': 'ListItem', position: 2, name: program.name, item: 'https://expertconsulting.es/academy' },
  ],
};

const faqJsonLd = program.faqs.length
  ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: program.faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    }
  : null;

export default function AcademyPage() {
  const calAcademyUrl = getCalAcademyUrl();

  return (
    <main className="bg-[#F8F6F1] text-[#0D1B2A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <EventTracker event="course_view" eventProps={{ program_slug: program.slug }} />
      {/* Hero */}
      <section className="brand-blue-bg px-6 py-16 text-[#F8F6F1] sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">EXPERT Business Academy</p>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-5xl">{program.name}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#9CA3AF] sm:text-lg">{program.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm">
              <Clock className="h-4 w-4 text-[#D4A017]" />
              {program.hoursTraining}h formación + {program.hoursInternship}h prácticas
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm">
              <Globe className="h-4 w-4 text-[#D4A017]" />
              Online · Español o ruso
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm">
              <Award className="h-4 w-4 text-[#D4A017]" />
              Diploma EXPERT + certificación oficial opcional
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <TrackedAnchor
              href="#solicitar-info"
              event="course_contact_click"
              eventProps={{ program_slug: program.slug, cta_location: 'hero' }}
              className="inline-flex items-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
            >
              Solicitar información
            </TrackedAnchor>
            <CalendlyButton
              url={calAcademyUrl}
              fallbackHref="/cita"
              analyticsEvent="course_meeting_click"
              analyticsProps={{ program_slug: program.slug, cta_location: 'hero' }}
              className="inline-flex items-center gap-2 border border-[#D4A017]/60 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017]/10"
            >
              <CalendarCheck className="h-4 w-4" />
              Reservar entrevista de admisión
            </CalendlyButton>
            <TrackedAnchor
              href={`/api/academy/programa-pdf?slug=${program.slug}`}
              event="course_program_download"
              eventProps={{ program_slug: program.slug }}
              className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]/85 transition hover:border-[#D4A017] hover:text-[#D4A017]"
            >
              <Download className="h-4 w-4" />
              Descargar programación
            </TrackedAnchor>
          </div>
        </div>
      </section>

      {/* Descripción + a quién va dirigido */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Conoce y gestiona todas las áreas de una empresa</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#23364D]">{program.shortDescription}</p>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">¿A quién va dirigido?</h3>
              <ul className="mt-4 space-y-2">
                {program.audience.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-[#23364D]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">¿Qué conseguirás?</h3>
              <ul className="mt-4 space-y-2">
                {program.outcomes.slice(0, 10).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-[#23364D]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Programa formativo */}
      <section className="brand-blue-bg px-6 py-14 text-[#F8F6F1]">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Programa formativo</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9CA3AF]">
            16 módulos que cubren toda la gestión empresarial, desde la constitución hasta la digitalización con IA.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {program.modules.map((mod) => (
              <div key={mod.order} className="border border-white/10 p-4">
                <p className="text-xs font-bold text-[#D4A017]">Módulo {mod.order}</p>
                <p className="mt-1 text-sm font-semibold leading-6">{mod.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proyecto final + metodología */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2">
          {program.finalProject && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">Proyecto final</h3>
              <p className="mt-3 text-sm leading-6 text-[#23364D]">{program.finalProject.description}</p>
              <ul className="mt-4 space-y-1.5">
                {program.finalProject.options.map((opt) => (
                  <li key={opt} className="flex items-start gap-2 text-sm leading-6 text-[#23364D]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">Metodología EXPERT</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {program.methodology.map((item) => (
                <li key={item} className="rounded-md border border-[#D4A017]/30 px-3 py-1.5 text-xs font-semibold text-[#23364D]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Certificación oficial */}
      {program.officialCertification && (
        <section className="px-6 pb-14">
          <div className="mx-auto max-w-5xl border border-[#D4A017]/30 bg-white p-6 sm:p-8">
            <h3 className="font-serif text-xl font-bold">Certificación oficial homologada opcional</h3>
            <p className="mt-3 text-sm leading-6 text-[#23364D]">
              El contenido del itinerario está alineado con el Certificado Profesional de nivel 3{' '}
              <strong>{program.officialCertification.code} — {program.officialCertification.name}</strong>.
            </p>
            <p className="mt-2 text-sm leading-6 text-[#23364D]">{program.officialCertification.requirementsNote}</p>
            <p className="mt-4 text-lg font-bold text-[#0D1B2A]">{program.officialCertification.price}</p>
            <p className="mt-1 text-xs text-[#8899aa]">
              Importe independiente del precio del programa, se abona únicamente cuando se confirma la incorporación al itinerario oficial.
            </p>
          </div>
        </section>
      )}

      {/* Precio */}
      <section className="brand-blue-bg px-6 py-14 text-[#F8F6F1]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Precio de lanzamiento</p>
          <p className="mt-4 font-serif text-5xl font-bold">{program.price}</p>
          <p className="mt-2 text-sm text-[#9CA3AF]">{program.priceNote}</p>
          <ul className="mx-auto mt-8 grid max-w-xl gap-2 text-left sm:grid-cols-2">
            {[
              `${program.hoursTraining} horas de formación`,
              'Material didáctico',
              'Campus virtual',
              'Tutorías individuales',
              'Casos prácticos',
              'Plantillas profesionales',
              'Proyecto final',
              `${program.hoursInternship} horas de prácticas`,
              'Diploma EXPERT Business Academy',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#F8F6F1]/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                {item}
              </li>
            ))}
          </ul>

          {program.stripePriceId && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <AcademyCheckoutButton
                programSlug={program.slug}
                ctaLocation="pricing"
                className="inline-flex items-center gap-2 bg-[#D4A017] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-xs text-[#9CA3AF]">Pago único y seguro con Stripe · Factura con IVA incluida</p>
            </div>
          )}
        </div>
      </section>

      {/* Perfiles objetivo */}
      {program.targetProfiles && (
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Una formación. Diferentes objetivos profesionales.</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {program.targetProfiles.map((profile) => (
              <div key={profile.title} className="border border-[#D4A017]/25 bg-white p-5">
                <h3 className="text-sm font-bold text-[#0D1B2A]">{profile.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#23364D]">{profile.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Otros programas de la Academy */}
      <OtherAcademyPrograms currentSlug={program.slug} />

      {/* FAQ */}
      <FaqSection items={program.faqs} />

      {/* Formulario de solicitud */}
      <section id="solicitar-info" className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Da el siguiente paso</p>
          <h2 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">Solicita información</h2>
          <p className="mt-3 text-sm leading-6 text-[#23364D]">
            Cuéntanos cuál es tu experiencia, tu puesto actual y tus objetivos. Revisaremos tu perfil y te
            informaremos sobre la modalidad más adecuada, el calendario, la opción de formación en ruso, los
            requisitos de acceso y la certificación oficial opcional.
          </p>
          <div className="mt-8">
            <AcademyLeadForm programSlug={program.slug} programName={program.name} />
          </div>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, Clock, Globe, Download, CalendarCheck, CreditCard, BookOpen } from 'lucide-react';
import { academyPrograms, getAcademyProgram } from '@/lib/data/academy-catalog';
import { AcademyLeadForm } from '@/components/site/AcademyLeadForm';
import { AcademyCheckoutButton } from '@/components/site/AcademyCheckoutButton';
import { CalendlyButton } from '@/components/site/CalendlyButton';
import { FaqSection } from '@/components/site/FaqSection';
import { getCalAcademyUrl } from '@/lib/utils/cal';
import { EventTracker } from '@/components/site/EventTracker';
import { TrackedAnchor } from '@/components/site/TrackedAnchor';
import { OtherAcademyPrograms } from '@/components/site/OtherAcademyPrograms';

// /academy (index) keeps serving academyPrograms[0] as its own dedicated
// page — this dynamic route only serves the other programs, so it never
// creates duplicate content for the first course.
const otherPrograms = academyPrograms.slice(1);

export function generateStaticParams() {
  return otherPrograms.map((p) => ({ slug: p.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

function getProgram(slug: string) {
  return otherPrograms.find((p) => p.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) return {};

  return {
    title: program.metaTitle,
    description: program.metaDescription,
    alternates: { canonical: `https://expertconsulting.es/academy/${program.slug}` },
    openGraph: {
      type: 'website',
      url: `https://expertconsulting.es/academy/${program.slug}`,
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
}

export default async function AcademyProgramPage({ params }: Props) {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) notFound();

  // Belt-and-braces: catalog helper stays the source of truth for lookups
  // elsewhere (checkout, leads, PDF) — confirm it agrees before rendering.
  if (getAcademyProgram(slug)?.slug !== program.slug) notFound();

  const calAcademyUrl = getCalAcademyUrl();
  const canonicalUrl = `https://expertconsulting.es/academy/${program.slug}`;
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
    url: canonicalUrl,
    ...(priceValue
      ? {
          offers: {
            '@type': 'Offer',
            price: priceValue,
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            url: canonicalUrl,
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://expertconsulting.es' },
      { '@type': 'ListItem', position: 2, name: 'EXPERT Business Academy', item: 'https://expertconsulting.es/academy' },
      { '@type': 'ListItem', position: 3, name: program.name, item: canonicalUrl },
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
              {program.hoursTraining}h formación
              {program.hoursTutoring ? ` + ${program.hoursTutoring}h tutoría` : ''}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-white/15 px-4 py-2 text-sm">
              <Globe className="h-4 w-4 text-[#D4A017]" />
              {program.languages.includes('ru') ? 'Online · Español o ruso' : 'Online'}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {program.paymentLink ? (
              <TrackedAnchor
                href={program.paymentLink}
                event="course_payment_click"
                eventProps={{ program_slug: program.slug, cta_location: 'hero' }}
                className="inline-flex items-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                <CreditCard className="h-4 w-4" />
                Inscribirme y pagar
              </TrackedAnchor>
            ) : program.stripePriceId ? (
              <AcademyCheckoutButton
                programSlug={program.slug}
                ctaLocation="hero"
                className="inline-flex items-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-60"
              />
            ) : null}
            <TrackedAnchor
              href="#solicitar-info"
              event="course_contact_click"
              eventProps={{ program_slug: program.slug, cta_location: 'hero' }}
              className="inline-flex items-center gap-2 border border-[#D4A017]/60 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017]/10"
            >
              Solicitar información
            </TrackedAnchor>
            <CalendlyButton
              url={calAcademyUrl}
              fallbackHref="/cita"
              analyticsEvent="course_meeting_click"
              analyticsProps={{ program_slug: program.slug, cta_location: 'hero' }}
              className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]/85 transition hover:border-[#D4A017] hover:text-[#D4A017]"
            >
              <CalendarCheck className="h-4 w-4" />
              Reservar reunión informativa
            </CalendlyButton>
            {program.downloadHref && (
              <TrackedAnchor
                href={program.downloadHref}
                event="course_program_download"
                eventProps={{ program_slug: program.slug }}
                className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]/85 transition hover:border-[#D4A017] hover:text-[#D4A017]"
              >
                <Download className="h-4 w-4" />
                Descargar programa
              </TrackedAnchor>
            )}
            {program.knowledgeBaseHref && (
              <a
                href={program.knowledgeBaseHref}
                className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1]/85 transition hover:border-[#D4A017] hover:text-[#D4A017]"
              >
                <BookOpen className="h-4 w-4" />
                Explorar manuales
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Descripción + a quién va dirigido */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
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
                {program.outcomes.map((item) => (
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
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Programa</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {program.modules.map((mod) => (
              <div key={mod.order} className="border border-white/10 p-4">
                <p className="text-xs font-bold text-[#D4A017]">Módulo {mod.order}</p>
                <p className="mt-1 text-sm font-semibold leading-6">{mod.title}</p>
                {mod.topics.map((topic) => (
                  <p key={topic} className="mt-1 text-xs leading-5 text-[#F8F6F1]/70">{topic}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutorías + metodología */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl grid gap-10 md:grid-cols-2">
          {program.tutoringIncluded && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#D4A017]">Tutorías incluidas</h3>
              <ul className="mt-4 space-y-1.5">
                {program.tutoringIncluded.map((item) => (
                  <li key={item.title} className="flex items-start justify-between gap-2 text-sm leading-6 text-[#23364D]">
                    <span className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                      {item.title}
                    </span>
                    <span className="whitespace-nowrap text-xs text-[#8899aa]">{item.hours}h</span>
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

      {/* Precio */}
      <section className="brand-blue-bg px-6 py-14 text-[#F8F6F1]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Inversión</p>
          <p className="mt-4 flex items-baseline justify-center gap-3">
            {program.valueLabel && (
              <span className="text-lg text-[#9CA3AF] line-through">{program.valueLabel}</span>
            )}
            <span className="font-serif text-5xl font-bold">{program.price}</span>
          </p>
          <p className="mt-2 text-sm text-[#9CA3AF]">{program.priceNote}</p>
          {program.taxNote && (
            <p className="mt-1 text-xs text-[#9CA3AF]/80">{program.taxNote}</p>
          )}

          {program.paymentLink ? (
            <div className="mt-10 flex flex-col items-center gap-3">
              <TrackedAnchor
                href={program.paymentLink}
                event="course_payment_click"
                eventProps={{ program_slug: program.slug, cta_location: 'pricing' }}
                className="inline-flex items-center gap-2 bg-[#D4A017] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                <CreditCard className="h-4 w-4" />
                Inscribirme y pagar
              </TrackedAnchor>
              <p className="text-xs text-[#9CA3AF]">Pago único y seguro con Stripe</p>
            </div>
          ) : program.stripePriceId ? (
            <div className="mt-10 flex flex-col items-center gap-3">
              <AcademyCheckoutButton
                programSlug={program.slug}
                ctaLocation="pricing"
                className="inline-flex items-center gap-2 bg-[#D4A017] px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-xs text-[#9CA3AF]">Pago único y seguro con Stripe · Factura con IVA incluida</p>
            </div>
          ) : null}
        </div>
      </section>

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
            Cuéntanos tu situación y tus dudas. Revisaremos tu caso y te informaremos sobre la modalidad más
            adecuada, el calendario y la opción de formación en ruso.
          </p>
          <div className="mt-8">
            <AcademyLeadForm
              programSlug={program.slug}
              programName={program.name}
              hasOfficialCertification={Boolean(program.officialCertification)}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

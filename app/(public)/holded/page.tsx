import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ClipboardCheck,
  Eye,
  FileText,
  Gift,
  Layers,
  MonitorCheck,
  Settings,
  ShieldCheck,
  Upload,
  Clock,
  Zap,
  UsersRound,
} from 'lucide-react';
import { HoldedCalendlyButton } from '@/components/holded/HoldedCalendlyButton';
import { HoldedPricingSection } from '@/components/holded/HoldedPricingSection';
import { articles } from '@/lib/utils/blog';
import { FaqSection } from '@/components/site/FaqSection';
import { JulyCampaignBanner } from '@/components/site/JulyCampaignBanner';
import { julySiteCampaignLinks } from '@/lib/marketing/july-2026';

export const metadata: Metadata = {
  title: 'Implantación, migración y formación en Holded | EXPERT',
  description:
    'Implantamos Holded con datos bien vinculados: clientes, proveedores, bancos, facturación, contabilidad, impuestos y stock. Holded Solution Partner certificados.',
  alternates: { canonical: 'https://expertconsulting.es/holded' },
  openGraph: {
    type: 'website',
    url: 'https://expertconsulting.es/holded',
    title: 'Implantación, migración y formación en Holded | EXPERT',
    description:
      'Implantamos Holded con datos bien vinculados para facturación, contabilidad, bancos e impuestos. EXPERT — Holded Solution Partner certificados.',
    siteName: 'EXPERT — Asesoría Fiscal y Legal',
    locale: 'es_ES',
    images: [{ url: 'https://expertconsulting.es/catalog/holded.png', width: 1200, height: 630, alt: 'Holded Solution Partner — EXPERT' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Implantación, migración y formación en Holded | EXPERT',
    description: 'Implantamos Holded con datos bien vinculados para facturación, contabilidad, bancos e impuestos.',
    images: ['https://expertconsulting.es/catalog/holded.png'],
  },
};

const migrationSteps = [
  { title: 'Diagnóstico', text: 'Revisamos tu sistema actual, facturación, bancos, impuestos y necesidades de reporting.', Icon: FileText },
  { title: 'Migración', text: 'Definimos qué datos se trasladan, qué se depura y cómo quedan bien vinculados en Holded: clientes, proveedores, artículos, bancos e impuestos.', Icon: Upload },
  { title: 'Configuración', text: 'Ajustamos facturas, contactos, bancos, categorías, impuestos y circuitos de trabajo por metodología con checklist de cierre.', Icon: Settings },
  { title: 'Formación', text: 'Sesiones prácticas para que el equipo trabaje con seguridad desde el primer día.', Icon: MonitorCheck },
] as const;

const aiCards = [
  {
    Icon: Eye,
    title: 'IA en modo consulta',
    subtitle: 'Solo lectura',
    desc: 'Pregunta por facturas, cobros, clientes o contabilidad en lenguaje claro. Sin modificar nada en tu cuenta.',
  },
  {
    Icon: ClipboardCheck,
    title: 'Borradores con confirmación',
    subtitle: 'Revisión obligatoria',
    desc: 'La IA genera propuestas revisables. Nada se publica ni se envía sin tu aprobación explícita.',
  },
  {
    Icon: Layers,
    title: 'Automatizaciones por API',
    subtitle: 'Integraciones a medida',
    desc: 'Flujos automatizados, conectores con herramientas externas y reporting a medida sobre tus datos reales.',
  },
] as const;

const holdedArticles = articles.filter((a) => a.category === 'Holded');

const holdedFaq = [
  {
    q: '¿Qué es Holded y para qué sirve?',
    a: 'Holded es un software de gestión empresarial en la nube que integra contabilidad, facturación, inventario, proyectos y CRM en un solo lugar. Permite tener visibilidad total del negocio en tiempo real desde cualquier dispositivo.',
  },
  {
    q: '¿Cuánto tiempo tarda la migración a Holded?',
    a: 'Depende del volumen de datos y la complejidad de tu situación actual. Un Pack Starter puede estar listo en 1-2 semanas. Una migración completa con historial contable e inventario suele tardar entre 3 y 6 semanas.',
  },
  {
    q: '¿Qué datos se pueden migrar a Holded?',
    a: 'Migramos clientes, proveedores, facturas emitidas y recibidas, saldos contables, productos y referencias de inventario, contactos y configuración bancaria. Previamente hacemos un diagnóstico para definir qué se migra y qué se depura, asegurando que los datos quedan bien vinculados.',
  },
  {
    q: '¿La formación está incluida en el precio de migración?',
    a: 'La formación es un módulo independiente disponible por 180 € + IVA. Puedes añadirla a la cesta junto al paquete de migración o contratarla por separado si ya tienes Holded y quieres mejorar el uso que le das.',
  },
  {
    q: '¿Puedo probar Holded antes de contratar la migración?',
    a: 'Sí. Como Holded Solution Partner podemos facilitarte una prueba gratuita de 14 días sin tarjeta de crédito. También ofrecemos una demo en vivo de 30 minutos adaptada a tu sector.',
  },
  {
    q: '¿Qué pasa si ya tengo Holded pero mal configurado?',
    a: 'Podemos hacer una auditoría de tu cuenta actual, reorganizar la estructura contable, limpiar datos y configurar correctamente todos los módulos. Contacta con nosotros para valorar tu caso.',
  },
  {
    q: '¿En qué consisten los conectores de IA para Holded?',
    a: 'Los conectores permiten consultar tus datos de Holded (facturas, cobros, contabilidad, clientes) mediante IA como Claude o ChatGPT en lenguaje claro, sin exportar hojas de cálculo. Empezamos siempre en modo solo lectura. Las acciones de escritura funcionan solo como borradores bajo confirmación explícita.',
  },
  {
    q: '¿Es seguro conectar Holded con IA?',
    a: 'Sí. La integración opera por defecto en solo lectura sobre la API de Holded. No mueve dinero, no envía emails automáticamente ni cierra contabilidad de forma autónoma. Cuando aplican acciones, se trabaja con borradores que el usuario revisa y confirma antes de ejecutarlos.',
  },
];

const holdedFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: holdedFaq.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default async function HoldedPage() {
  return (
    <main className="bg-[#F8F6F1] text-[#0D1B2A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(holdedFaqJsonLd) }} />
      <JulyCampaignBanner focus="holded" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="brand-blue-bg px-6 py-20 text-[#F8F6F1] md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Image src="/Holded-Logotype-Red_Light.svg" alt="Holded" width={120} height={36} className="mb-5 h-9 w-auto" />
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Solution Partner certificado</p>
            <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight md:text-6xl">
              Implantación, migración y formación práctica en Holded
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#9CA3AF] md:text-lg">
              Dejamos Holded operativo con datos bien vinculados, procesos claros y una configuración preparada para facturación, contabilidad, bancos e impuestos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={julySiteCampaignLinks.holded}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                <Upload className="h-4 w-4" />
                Diagnóstico migración
              </Link>
              <Link
                href="/holded/pack-starter?utm_source=site&utm_medium=hero&utm_campaign=julio_holded_2026"
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#D4A017]/60 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#F8F6F1] transition hover:bg-[#D4A017]/10"
              >
                <Gift className="h-4 w-4" />
                Ver Pack Starter
              </Link>
            </div>
          </div>

          <div className="border border-[#D4A017]/25 bg-[#23364D]/35 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D4A017]">Qué incluye</p>
            <div className="mt-5 space-y-3">
              {[
                'Migración desde hojas de cálculo o software anterior',
                'Datos bien vinculados: clientes, proveedores, bancos e impuestos',
                'Configuración inicial de empresa, facturación y contabilidad',
                'Implantación por metodología con checklist de cierre',
                'Formación en Holded en bloques de 2 horas',
                'Acompañamiento inicial tras la migración',
              ].map((s) => (
                <div key={s} className="flex gap-3 border border-[#D4A017]/20 bg-[#0D1B2A]/45 p-4">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" />
                  <p className="text-sm leading-6 text-[#F8F6F1]/86">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Licencias Holded ──────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-12 md:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Licencias Holded</p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-[#0D1B2A] md:text-3xl">
              ¿Aún no tienes Holded? Empieza aquí.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#23364D]">
              Como Solution Partner certificados, gestionamos tu acceso con condiciones exclusivas y te acompañamos desde el primer día.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Prueba gratuita */}
            <div className="flex flex-col items-center border border-[#D4A017] bg-[#D4A017]/5 p-7 text-center">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/15">
                <Gift className="h-6 w-6 text-[#D4A017]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-[#0D1B2A]">Prueba gratis 14 días</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#23364D]">
                Sin tarjeta de crédito. Lo activamos con nuestra cuenta de partner y hacemos el onboarding contigo.
              </p>
              <Link
                href="/planes/gratuito"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#D4A017] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                <Gift className="h-4 w-4" />
                Solicitar prueba gratuita
              </Link>
            </div>

            {/* Demo en vivo */}
            <div className="flex flex-col items-center border border-[#D4A017]/30 bg-white p-7 text-center">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/10">
                <Calendar className="h-6 w-6 text-[#D4A017]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-[#0D1B2A]">Demo en vivo — 30 min</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#23364D]">
                Te mostramos Holded adaptado a tu sector por videollamada. Sin compromiso y sin tarjeta de crédito.
              </p>
              <HoldedCalendlyButton className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-[#D4A017] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#D4A017] transition hover:bg-[#D4A017] hover:text-[#0D1B2A]">
                <Calendar className="h-4 w-4" />
                Reservar demostración
              </HoldedCalendlyButton>
            </div>

            {/* Licencia con asistencia */}
            <div className="flex flex-col items-center border border-[#D4A017]/30 bg-white p-7 text-center">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/10">
                <Zap className="h-6 w-6 text-[#D4A017]" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-[#0D1B2A]">Licencia con asistencia</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[#23364D]">
                Contrata Holded a través de nosotros y recibe configuración inicial, soporte y formación desde el primer día.
              </p>
              <Link
                href="/contacto?asunto=Licencia%20Holded%20con%20asistencia"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 border border-[#D4A017] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[#D4A017] transition hover:bg-[#D4A017] hover:text-[#0D1B2A]"
              >
                Solicitar información <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conectores e IA ───────────────────────────────────────────────── */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Conectores e IA</p>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-4xl">
                La capa que hace Holded más rápido
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#23364D] md:text-base">
                Conecta Holded con la IA que ya usas para consultar facturas, clientes y contabilidad en lenguaje claro. Empezamos en modo solo lectura y, cuando aplica, trabajamos con borradores bajo confirmación.
              </p>
              <div className="mt-5 flex items-start gap-3 border border-[#D4A017]/30 bg-[#D4A017]/8 px-4 py-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" />
                <p className="text-xs leading-5 text-[#23364D]">
                  <span className="font-bold">Seguridad:</span> lectura por defecto; acciones solo como borradores con revisión.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/holded/conectores"
                  className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
                >
                  Ver opciones de conectores <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://holded.verifactu.business/demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#D4A017]/60 px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:border-[#D4A017]"
                >
                  Solicitar demo conectores
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              {aiCards.map(({ Icon, title, subtitle, desc }) => (
                <div key={title} className="flex gap-4 border border-[#D4A017]/25 bg-white p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#D4A017]/10">
                    <Icon className="h-5 w-5 text-[#D4A017]" />
                  </div>
                  <div>
                    <p className="font-serif text-base font-bold text-[#0D1B2A]">{title}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A017]">{subtitle}</p>
                    <p className="mt-1.5 text-sm leading-6 text-[#23364D]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing + add-on configurator ─────────────────────────────────── */}
      <HoldedPricingSection />

      {/* ── Migración laboral por empleado ───────────────────────────────── */}
      <section className="bg-[#0D1B2A] px-6 py-16 text-white md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Nuevo · Área laboral</p>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl font-bold leading-tight md:text-4xl">
              Migración laboral a Holded desde 50 € + IVA por empleado
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#D1D5DB] md:text-base">
              Configuramos cada perfil laboral, revisamos contrato, jornada, salario e IRPF y comprobamos el resultado con una nómina de prueba. Un servicio puntual para empezar con una plantilla limpia y validada.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/holded/migracion-laboral"
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#D4A017] px-6 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                Ver migración laboral <ArrowRight className="h-4 w-4" />
              </Link>
              <HoldedCalendlyButton className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/25 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:border-[#D4A017]">
                <Calendar className="h-4 w-4" />
                Revisión previa — 15 min
              </HoldedCalendlyButton>
            </div>
          </div>
          <div className="border border-[#D4A017]/35 bg-white/5 p-7">
            <UsersRound className="h-8 w-8 text-[#D4A017]" />
            <p className="mt-5 font-serif text-5xl font-bold">50 €</p>
            <p className="mt-1 text-sm text-[#D1D5DB]">+ IVA por empleado · pedido mínimo 5</p>
            <ul className="mt-6 space-y-3 text-sm text-[#D1D5DB]">
              {['Perfil laboral configurado', 'Datos contrastados', 'Nómina de prueba', 'Informe de incidencias'].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#D4A017]" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Process steps ─────────────────────────────────────────────────── */}
      <section id="formacion" className="scroll-mt-24 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Proceso</p>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-4xl">
              Una implantación pensada para no desordenar tu actividad.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[#23364D] md:text-base">
              Primero ordenamos el punto de partida, después migramos y configuramos por metodología, y finalmente formamos al equipo.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {migrationSteps.map(({ Icon, title, text }) => (
              <article key={title} className="border border-[#D4A017]/25 bg-[#F8F6F1] p-6 shadow-[0_10px_28px_rgba(13,27,42,0.07)]">
                <Icon className="h-8 w-8 stroke-[#D4A017]" strokeWidth={1.7} />
                <h3 className="mt-6 font-serif text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#23364D]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 CTAs ────────────────────────────────────────────────────────── */}
      <section id="demo" className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">¿Por dónde empezar?</p>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-tight">Elige cómo quieres avanzar.</h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {/* CTA 1 — Presupuesto personalizado */}
            <div className="flex flex-col border border-[#D4A017]/25 bg-[#F8F6F1] p-7">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/10 text-[#D4A017]">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold">Presupuesto personalizado</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#23364D]">
                ¿Tu caso no encaja exactamente en ningún paquete? Cuéntanos la situación y preparamos una propuesta a medida: volumen de datos, historial, integraciones especiales.
              </p>
              <Link
                href="/solicitar-presupuesto?servicio=migracion-holded-personalizada"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D4A017] transition hover:text-[#F2C14E]"
              >
                Solicitar presupuesto <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CTA 2 — Prueba gratuita 14 días */}
            <div className="flex flex-col border border-[#D4A017]/25 bg-[#F8F6F1] p-7">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/10 text-[#D4A017]">
                <Gift className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold">Prueba gratuita 14 días</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#23364D]">
                ¿Quieres probar Holded antes de comprometerte? Solicítanos acceso a una prueba gratuita de 14 días con nuestra cuenta de partner. Sin tarjeta de crédito.
              </p>
              <Link
                href="/planes/gratuito"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D4A017] transition hover:text-[#F2C14E]"
              >
                Solicitar prueba gratuita <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* CTA 3 — Demo Cal.com */}
            <div className="flex flex-col border border-[#D4A017] bg-[#0D1B2A] p-7 text-[#F8F6F1]">
              <div className="flex h-12 w-12 items-center justify-center bg-[#D4A017]/15 text-[#D4A017]">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-serif text-xl font-bold">Demostración gratuita</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#9CA3AF]">
                30 minutos por videollamada. Te mostramos Holded en vivo adaptado a tu sector y resolvemos todas tus dudas antes de tomar ninguna decisión.
              </p>
              <HoldedCalendlyButton className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#D4A017] transition hover:text-[#F2C14E]">
                Reservar demo <ArrowRight className="h-4 w-4" />
              </HoldedCalendlyButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tras la migración: planes mensuales ─────────────────────────────── */}
      <section className="px-6 py-14 md:py-16">
        <div className="mx-auto max-w-4xl border border-[#D4A017]/30 bg-white p-8 text-center shadow-[0_8px_24px_rgba(13,27,42,0.07)] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Después de migrar</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#0D1B2A] md:text-3xl">
            Mantén Holded al día con un plan mensual
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#23364D]">
            Una migración bien hecha es el primer paso. Para no volver al caos en el siguiente cierre, lo recomendable es supervisión continua: revisión mensual, alertas y acompañamiento experto.
          </p>
          <Link
            href="/planes"
            className="mt-6 inline-flex min-h-11 items-center gap-2 bg-[#D4A017] px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
          >
            Comparar planes mensuales
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <FaqSection items={holdedFaq} title="Preguntas frecuentes sobre Holded" />

      {/* ── Holded blog articles ───────────────────────────────────────────── */}
      {holdedArticles.length > 0 && (
        <section className="brand-blue-bg px-6 py-16 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#D4A017]">Recursos</p>
                <h2 className="mt-3 font-serif text-2xl font-bold text-[#F8F6F1] md:text-3xl">
                  Guías sobre Holded para tu empresa.
                </h2>
              </div>
              <Link href="/blog" className="text-sm font-semibold text-[#D4A017] hover:text-[#F2C14E]">
                Ver todos los artículos →
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {holdedArticles.map((a) => (
                <article key={a.slug} className="flex flex-col border border-[#D4A017]/25 bg-[#23364D]/40 p-6">
                  <span className="inline-block self-start border border-rose-400/40 bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                    {a.category}
                  </span>
                  <h3 className="mt-4 font-serif text-lg font-bold leading-snug text-[#F8F6F1]">{a.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#9CA3AF]">{a.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between text-xs text-[#6b7a8d]">
                    <span>{a.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {a.readTime}
                    </span>
                  </div>
                  <Link
                    href={`/blog/${a.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#D4A017] transition hover:text-[#F2C14E]"
                  >
                    Leer artículo <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 text-center md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Siguiente paso</p>
          <h2 className="mt-4 font-serif text-3xl font-bold leading-tight md:text-5xl">
            Revisamos tu caso y preparamos una hoja de ruta.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#23364D]">
            Si ya usas Holded o quieres migrar, empezamos con una revisión inicial para definir alcance, prioridades y formación. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <HoldedCalendlyButton className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#D4A017] px-8 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]">
              <Calendar className="h-4 w-4" />
              Reservar demo gratuita
            </HoldedCalendlyButton>
            <Link
              href="/holded/conectores"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#0D1B2A]/25 px-8 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:border-[#D4A017]"
            >
              <Bot className="h-4 w-4" />
              Ver Conectores e IA
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}

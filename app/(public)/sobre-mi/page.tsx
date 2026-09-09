import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Award, Briefcase, CheckCircle, GraduationCap, Shield, Target, Leaf, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nosotros — Misión y compromiso | EXPERT',
  description:
    'Conoce a EXPERT: nuestra misión, la responsabilidad corporativa que guía cómo trabajamos, nuestro compromiso medioambiental con Stripe Climate y el equipo detrás de la asesoría.',
  openGraph: {
    type: 'website',
    url: 'https://expertconsulting.es/sobre-mi',
    title: 'Nosotros — Misión, responsabilidad y equipo | EXPERT',
    description:
      'Nuestra misión, la responsabilidad corporativa que guía cómo trabajamos y nuestro compromiso medioambiental con Stripe Climate.',
    siteName: 'EXPERT — Asesoría Fiscal y Legal',
    locale: 'es_ES',
    images: [{ url: '/branding/expert%20servicios.png', width: 1200, height: 630, alt: 'EXPERT — Asesoría Fiscal y Legal' }]
  },
  twitter: { card: 'summary_large_image', images: ['/branding/expert%20servicios.png'] },
  alternates: { canonical: 'https://expertconsulting.es/sobre-mi' }
};

const credentials = [
  { Icon: Shield, label: 'Colaboradora social AEAT', text: 'Autorizados para presentar declaraciones ante la Agencia Tributaria en nombre de clientes.' },
  { Icon: Briefcase, label: 'Holded Solution Partner', text: 'Partners certificados de Holded para implementación, migración y formación en el ERP.' },
  { Icon: Award, label: 'Camerfirma — Punto de Registro', text: 'Autorizados para emitir certificados digitales cualificados para personas y empresas.' },
  { Icon: GraduationCap, label: 'Red PAE', text: 'Punto de Atención al Emprendedor integrado en la red oficial de apoyo a nuevos negocios.' }
];

const values = [
  { title: 'Claridad ante todo', text: 'Los trámites son complejos; la comunicación no tiene por qué serlo. Explicamos cada paso con claridad y en el idioma que necesites.' },
  { title: 'Gestión 100 % digital', text: 'Sin desplazamientos innecesarios. Todo el proceso se gestiona de forma online desde cualquier lugar, con menos papel y menos huella.' },
  { title: 'Criterio profesional', text: 'No solo presentamos documentos: analizamos tu situación, identificamos riesgos y proponemos la mejor estrategia para tu caso.' },
  { title: 'Respuesta rápida', text: 'Los plazos de Hacienda no esperan. Nos comprometemos a responder y actuar a tiempo, siempre.' }
];

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'EXPERT — Asesoría Fiscal y Legal',
  url: 'https://expertconsulting.es',
  logo: 'https://expertconsulting.es/branding/expert-app.png',
  description: 'Asesoría fiscal, legal y administrativa en España. Colaboradora social AEAT, Holded Solution Partner, Punto de Registro Camerfirma y Red PAE.',
  founder: {
    '@type': 'Person',
    name: 'Ksenia Ilicheva',
    jobTitle: 'Fundadora y asesora fiscal, legal y administrativa',
    knowsLanguage: ['es', 'ru', 'en'],
    sameAs: 'https://www.linkedin.com/in/ksenia-ilicheva/',
  },
  hasCredential: [
    { '@type': 'EducationalOccupationalCredential', name: 'Colaboradora Social AEAT', recognizedBy: { '@type': 'Organization', name: 'Agencia Tributaria' } },
    { '@type': 'EducationalOccupationalCredential', name: 'Holded Solution Partner', recognizedBy: { '@type': 'Organization', name: 'Holded' } },
    { '@type': 'EducationalOccupationalCredential', name: 'Punto de Registro Camerfirma', recognizedBy: { '@type': 'Organization', name: 'Camerfirma' } },
    { '@type': 'EducationalOccupationalCredential', name: 'Red PAE', recognizedBy: { '@type': 'Organization', name: 'Red PAE — Puntos de Atención al Emprendedor' } },
  ],
};

export default function NosotrosPage() {
  return (
    <main className="bg-[#F8F6F1] text-[#0D1B2A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      {/* Hero */}
      <section className="brand-blue-bg px-6 py-16 text-[#F8F6F1] md:py-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="relative mx-auto h-56 w-56 shrink-0 overflow-hidden rounded-full border-4 border-[#D4A017]/40 shadow-2xl lg:h-64 lg:w-64">
            <Image
              src="/avatars/ksenia-perfil.png"
              alt="Ksenia Ilicheva, fundadora de EXPERT"
              fill
              sizes="256px"
              className="object-cover object-top"
              priority
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Nosotros</p>
            <h1 className="mt-3 font-serif text-3xl font-bold leading-tight md:text-5xl">Una asesoría con una misión clara</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#9CA3AF]">
              Somos el equipo que hay detrás de EXPERT: fiscalidad, extranjería y gestión empresarial resueltas con
              rigor, tecnología y un compromiso real — con cada cliente, con la sociedad y con el planeta.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/solicitar-presupuesto"
                className="inline-flex min-h-11 items-center gap-2 bg-[#D4A017] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
              >
                Trabajemos juntos
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://www.linkedin.com/in/ksenia-ilicheva/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 border border-[#D4A017]/50 px-6 py-2.5 text-sm font-semibold text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017] hover:text-[#0D1B2A]"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Misión y objetivos */}
      <section className="px-6 py-14 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-[#D4A017]" />
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Misión y objetivos</p>
          </div>
          <h2 className="mt-4 max-w-3xl font-serif text-2xl font-bold md:text-3xl">
            Antes que crecer a cualquier precio, hacer las cosas bien.
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#23364D] md:text-base">
            Nuestro objetivo principal no es tramitar el mayor número de expedientes posible: es que cada cliente
            reciba una gestión clara, honesta y bien hecha, y que esa forma de trabajar sea sostenible — para las
            personas que confían en nosotros, para nuestro equipo y para el entorno en el que operamos. La
            responsabilidad corporativa no es una sección aparte de lo que hacemos: es el criterio con el que
            decidimos cómo lo hacemos.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border border-[#D4A017]/20 bg-white p-5">
              <Users className="h-5 w-5 text-[#D4A017]" />
              <p className="mt-3 text-sm font-bold">Con nuestros clientes</p>
              <p className="mt-1 text-xs leading-5 text-[#23364D]">Criterio profesional y comunicación honesta, incluso cuando la respuesta no es la que se esperaba.</p>
            </div>
            <div className="border border-[#D4A017]/20 bg-white p-5">
              <Shield className="h-5 w-5 text-[#D4A017]" />
              <p className="mt-3 text-sm font-bold">Con la sociedad</p>
              <p className="mt-1 text-xs leading-5 text-[#23364D]">Cumplimiento riguroso de la normativa fiscal y legal, sin atajos, como colaboradores sociales de la AEAT.</p>
            </div>
            <div className="border border-[#D4A017]/20 bg-white p-5">
              <Leaf className="h-5 w-5 text-[#D4A017]" />
              <p className="mt-3 text-sm font-bold">Con el planeta</p>
              <p className="mt-1 text-xs leading-5 text-[#23364D]">Una gestión 100&nbsp;% digital y una parte de cada cobro destinada a eliminación de carbono. Ver más abajo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Compromiso verde / Stripe Climate */}
      <section className="bg-[#0D1B2A] px-6 py-14 text-[#F8F6F1] md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <Leaf className="h-6 w-6 text-[#D4A017]" />
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Compromiso verde</p>
          </div>
          <h2 className="mt-4 max-w-3xl font-serif text-2xl font-bold md:text-3xl">
            Colaboramos con Stripe Climate
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-[#D1D5DB] md:text-base">
            Destinamos el <strong className="text-white">0,5 % de los cobros que procesamos a través de Stripe</strong> a
            Stripe Climate, el programa de Stripe que financia proyectos de eliminación de carbono de nueva generación.
            No es un coste adicional para el cliente: es parte de cómo entendemos la responsabilidad de gestionar
            un negocio digital. Junto con una operativa 100&nbsp;% online — sin desplazamientos ni papeleo
            innecesario — es nuestra forma de mantener una huella lo más pequeña posible mientras seguimos creciendo.
          </p>
          <a
            href="https://climate.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 border border-[#D4A017]/50 px-6 py-2.5 text-sm font-semibold text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017] hover:text-[#0D1B2A]"
          >
            Más sobre Stripe Climate
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Bio */}
      <section className="px-6 py-14 md:py-18">
        <div className="mx-auto max-w-5xl grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            <h2 className="font-serif text-2xl font-bold md:text-3xl">Nuestra historia</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#23364D] md:text-base">
              <p>
                Todo empezó con Ksenia Ilicheva, que hace más de dos décadas inició su carrera en el ámbito fiscal y
                administrativo, cuando los trámites con la Administración eran todavía mayoritariamente presenciales
                y la digitalización apenas empezaba. Esa experiencia sentó una base sólida en la normativa española
                y un conocimiento profundo de los procesos reales que hay detrás de cada declaración, permiso o
                escritura.
              </p>
              <p>
                Con el tiempo, especializamos nuestra práctica en los colectivos que más lo necesitan: expatriados
                que llegan a España sin saber por dónde empezar, empresas internacionales que necesitan cumplimiento
                fiscal local, y autónomos que quieren crecer sin ahogarse en burocracia. Esa combinación de perfiles
                nos ha dado una visión muy completa de los retos fiscales y legales en España.
              </p>
              <p>
                Hoy, a través de EXPERT, ofrecemos un servicio completamente digital que permite gestionar cualquier
                trámite desde cualquier lugar. Sin desplazamientos, sin papeleo innecesario, con seguimiento claro y
                comunicación directa.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="font-serif text-xl font-bold">¿Por qué elegir EXPERT?</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {values.map(({ title, text }) => (
                  <div key={title} className="flex items-start gap-3 border border-[#D4A017]/20 bg-white p-4 shadow-sm">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" />
                    <div>
                      <p className="font-semibold text-[#0D1B2A]">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#23364D]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar credentials */}
          <div className="space-y-5">
            <div className="bg-[#0D1B2A] p-6 text-[#F8F6F1]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4A017]">Acreditaciones</p>
              <ul className="mt-5 space-y-5">
                {credentials.map(({ Icon, label, text }) => (
                  <li key={label} className="flex items-start gap-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#D4A017]" />
                    <div>
                      <p className="text-sm font-bold text-[#F8F6F1]">{label}</p>
                      <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#D4A017]/25 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#23364D]">Idiomas de trabajo</p>
              <ul className="mt-4 space-y-2 text-sm text-[#23364D]">
                <li className="flex items-center gap-2"><span className="text-[#D4A017]">●</span> Español (nativo)</li>
                <li className="flex items-center gap-2"><span className="text-[#D4A017]">●</span> Ruso (nativo)</li>
                <li className="flex items-center gap-2"><span className="text-[#D4A017]">●</span> Inglés (profesional)</li>
              </ul>
            </div>

            <div className="border border-[#D4A017]/25 bg-white p-6 text-center">
              <p className="font-serif text-4xl font-bold text-[#D4A017]">+20</p>
              <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">años de experiencia</p>
              <p className="mt-4 font-serif text-4xl font-bold text-[#D4A017]">500+</p>
              <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">clientes gestionados</p>
              <p className="mt-4 font-serif text-4xl font-bold text-[#D4A017]">0,5 %</p>
              <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">de cada cobro Stripe, a eliminación de carbono</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0D1B2A] px-6 py-14 text-center text-[#F8F6F1]">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">Hablemos</p>
          <h2 className="mt-3 font-serif text-2xl font-bold md:text-3xl">¿Tienes una consulta?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#9CA3AF]">
            Cuéntanos tu caso sin compromiso. Analizamos tu situación y te proponemos la mejor solución.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              href="/solicitar-presupuesto"
              className="inline-flex min-h-12 items-center gap-2 bg-[#D4A017] px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition hover:bg-[#F2C14E]"
            >
              Solicitar presupuesto
            </Link>
            <Link
              href="/contacto"
              className="inline-flex min-h-12 items-center gap-2 border border-[#D4A017]/50 px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#D4A017] transition hover:border-[#D4A017] hover:bg-[#D4A017] hover:text-[#0D1B2A]"
            >
              Escríbenos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

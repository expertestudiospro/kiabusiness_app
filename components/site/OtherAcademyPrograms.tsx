import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { academyPrograms, getAcademyProgramPath } from '@/lib/data/academy-catalog';

/**
 * Cross-links to the *other* Academy programs. Renders nothing if there's
 * only one program in the catalog. Keeps every course discoverable from
 * every course page, instead of relying solely on the nav dropdown.
 */
export function OtherAcademyPrograms({ currentSlug }: { currentSlug: string }) {
  const others = academyPrograms.filter((p) => p.slug !== currentSlug);
  if (others.length === 0) return null;

  return (
    <section className="border-t border-[#D4A017]/15 bg-[#F8F6F1] px-6 py-14 md:py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#D4A017]">EXPERT Business Academy</p>
        <h2 className="mt-3 font-serif text-2xl font-bold text-[#0D1B2A] sm:text-3xl">Otros programas</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#23364D]">
          Esta no es la única formación de la Academy — según tu perfil, otra puede encajar mejor.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {others.map((program) => (
            <Link
              key={program.slug}
              href={getAcademyProgramPath(program.slug)}
              className="group flex flex-col border border-[#D4A017]/25 bg-white p-6 transition hover:border-[#D4A017]"
            >
              <p className="font-serif text-lg font-bold text-[#0D1B2A]">{program.name}</p>
              <p className="mt-2 text-sm leading-6 text-[#23364D]">{program.tagline}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#8899aa]">
                <Clock className="h-3.5 w-3.5 text-[#D4A017]" />
                {program.hoursTraining}h{program.hoursInternship ? ` + ${program.hoursInternship}h prácticas` : ''}
                {program.hoursTutoring ? ` + ${program.hoursTutoring}h tutoría` : ''}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-serif text-xl font-bold text-[#D4A017]">{program.price}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] transition group-hover:gap-2.5">
                  Ver programa <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

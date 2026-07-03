import Image from "next/image";
import { Trophy } from "lucide-react";

/**
 * "Seus mentores" — the real coaches, ported from the old landing (photos from
 * the Horizons CDN, whitelisted in next.config). Grayscale → color on hover.
 */
const MENTORS = [
  {
    name: "Ego Illusions",
    title: "Coach Expert",
    image:
      "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/36b0bb88213e89062a4b3e4f737eff36.png",
    objectPosition: "center",
    achievements: [
      "Top 1 BR em diversos sets",
      "Top 11 mundial",
      "Campeão Brasileiro",
      "Diversas vezes finalista Americas Tactician's Cup",
      "Finalista Americas Golden Spatula",
    ],
  },
  {
    name: "Koala",
    title: "Analista Expert",
    image:
      "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/7c0285009f3ab492b091a37a3044ef72.jpg",
    objectPosition: "center 20%",
    achievements: [
      "Top 1 BR em diversos sets",
      "Top 21 mundial",
      "Duas vezes Top 3 Brasileiro",
      "Campeão e Vice Americas Tactician's Cup",
      "Semifinalista Paris Open",
    ],
  },
] as const;

export function MentorsSection() {
  return (
    <section
      id="mentores"
      className="relative overflow-hidden bg-background px-4 py-16 md:py-24"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-1/3 w-1/3 rounded-full bg-primary/5 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-1/3 rounded-full bg-secondary/10 blur-[100px]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Seus <span className="text-primary">mentores</span>
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-lg text-muted-foreground">
            Especialistas em análise de gameplay e estratégia competitiva, com
            experiência internacional em campeonatos de alto nível e mais de 200
            alunos orientados.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.name}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-[0_0_30px_hsl(var(--primary)/0.12)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={mentor.image}
                  alt={mentor.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  style={{ objectPosition: mentor.objectPosition }}
                  className="object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6">
                  <h3 className="text-2xl font-black italic tracking-tight text-foreground">
                    {mentor.name.toUpperCase()}
                  </h3>
                  <p className="mt-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                    <span className="inline-block h-0.5 w-8 bg-primary" />
                    {mentor.title}
                  </p>
                </div>
              </div>

              <div className="flex-1 p-6">
                <h4 className="mb-4 border-b border-border pb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Principais conquistas
                </h4>
                <ul className="space-y-3">
                  {mentor.achievements.map((achievement) => (
                    <li
                      key={achievement}
                      className="flex items-start gap-3 text-foreground/90"
                    >
                      <span className="mt-0.5 rounded-lg border border-primary/30 bg-primary/10 p-1.5">
                        <Trophy size={16} className="shrink-0 text-primary" />
                      </span>
                      <span className="font-medium leading-tight">
                        {achievement}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

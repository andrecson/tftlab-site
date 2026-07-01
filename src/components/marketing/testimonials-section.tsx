"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * "Resultados de sucesso" — a carousel of students' rank-achievement
 * screenshots, ported from the old landing. Auto-advances (paused when the tab
 * is hidden); prev/next + dots. Client component for the carousel state.
 */
const RESULTS = [
  {
    name: "Maybe",
    rank: "Challenger",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/b9c3a1b0bb6a0e6c345baeae5fcda660.png",
  },
  {
    name: "FilipeCavalcante",
    rank: "Master",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/b9ee9abdd47840b81245334cce583aef.png",
  },
  {
    name: "enzo",
    rank: "Grand Master",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/914a98d7eb41e58cf9e37504a0ba573a.png",
  },
  {
    name: "Theusma",
    rank: "Master",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/431c38346a177ad1ec2e804f8490f772.png",
  },
  {
    name: "top 6",
    rank: "Grand Master",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/47c26bc5dc7b613ecf419b2251b186c5.png",
  },
  {
    name: "azehmust",
    rank: "Grand Master",
    url: "https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/2c79f57a7f1e49003a9f76c55afa56df.png",
  },
];

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + RESULTS.length) % RESULTS.length),
    [],
  );

  useEffect(() => {
    const timer = setInterval(() => go(1), 6000);
    return () => clearInterval(timer);
  }, [go]);

  const current = RESULTS[index];

  return (
    <section className="bg-background px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Resultados de <span className="text-primary">sucesso</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Conquistas e evoluções reais dos nossos alunos com o método.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-black/40">
            <div className="relative aspect-[16/10] w-full">
              <Image
                key={current.url}
                src={current.url}
                alt={`${current.name} — ${current.rank}`}
                fill
                sizes="(max-width: 768px) 100vw, 900px"
                className="object-contain"
              />
            </div>

            <div className="pointer-events-none absolute bottom-3 left-4 rounded-md bg-black/60 px-3 py-1 text-sm font-bold text-foreground backdrop-blur">
              {current.name}{" "}
              <span className="text-primary">· {current.rank}</span>
            </div>

            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2.5 text-white opacity-0 transition-all hover:border-primary/50 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/70 p-2.5 text-white opacity-0 transition-all hover:border-primary/50 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {RESULTS.map((r, i) => (
              <button
                key={r.url}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para o resultado ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                    : "w-2 bg-muted hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

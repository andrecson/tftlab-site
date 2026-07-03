import Image from "next/image";
import Link from "next/link";

/**
 * Landing hero — ported from the old tftlab.com.br (Hostinger Horizons) coaching
 * site into our design tokens (cyan primary on dark). Background art + logo are
 * served from the Horizons CDN (whitelisted in next.config). CTAs funnel to the
 * plans page and cross-link to the Tier List tool.
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center justify-center overflow-hidden">
      {/* Background art + overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/051ed7fdbaa6a35e32ca51585e48fd2a.jpg)",
        }}
      >
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 text-center">
        {/* The logo image carries the visual title; this gives the page a real,
            single <h1> for SEO + screen readers. */}
        <h1 className="sr-only">
          TFTLab: coaching, tier lists e guias de Teamfight Tactics
        </h1>

        <span className="mb-6 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-bold uppercase tracking-wider text-primary">
          Aprenda com os melhores
        </span>

        <Image
          src="https://horizons-cdn.hostinger.com/19cde671-22fd-4608-ac32-02401b7a276e/b88615b9d4dc1c144ed334f65ec0c3d4.png"
          alt="TFTLab"
          width={900}
          height={300}
          priority
          sizes="(max-width: 768px) 90vw, 820px"
          className="mx-auto mb-8 h-auto w-full max-w-[560px] drop-shadow-2xl md:max-w-[820px]"
        />

        <p className="mb-10 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:text-2xl">
          Ambiente completo para melhorar seu gameplay e dominar o jogo. Aulas
          semanais, tier lists atualizadas e guias de especialistas com
          experiência internacional.
        </p>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Link
            href="/planos"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-lg font-black uppercase tracking-wide text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.5)] transition-all hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)] sm:w-auto"
          >
            Entrar no laboratório
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/tier-list"
            className="inline-flex w-full items-center justify-center rounded-lg border-2 border-border bg-transparent px-8 py-4 text-lg font-bold uppercase tracking-wide text-foreground transition-colors hover:border-foreground/60 hover:bg-white/5 sm:w-auto"
          >
            Ver a Tier List
          </Link>
        </div>
      </div>
    </section>
  );
}

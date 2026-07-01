/**
 * Public page hero heading — the "esports competitivo" register chosen for the
 * bolder pass: a bold uppercase title with a cyan accent bar and an uppercase
 * supporting line. Shared by the Tier List and Builder so the tone is identical
 * across surfaces. Presentational; no client code.
 */
export function PageHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-9 w-1.5 shrink-0 rounded-full bg-primary sm:h-10"
        />
        <h1 className="text-4xl font-extrabold uppercase tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
      </div>
      <p className="mt-3 text-sm font-medium uppercase tracking-wide text-muted-foreground sm:text-base">
        {subtitle}
      </p>
    </header>
  );
}

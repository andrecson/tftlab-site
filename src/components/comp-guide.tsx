import type { ReactNode } from "react";

import { SectionHeading } from "@/components/section-heading";
import type { CompDetail } from "@/server/queries/comp";

/**
 * Guide section of a comp-detail page (US-022).
 *
 * `CompGuide` splits the comp's guide into two themes:
 *   - "Quando jogar" — a single block (the `whenToPlay` field).
 *   - "Como jogar" — three subsections, "Início de jogo" (`earlyGame`),
 *     "Meio jogo" (`midGame`) and "Fim de jogo" (`lateGame`). These three phases
 *     replace any "Stage 2/3/4" labels — none of those appear.
 * followed by an optional "Dicas" block (`tips`).
 *
 * Text is rendered readably (paragraph per line) and the names of the comp's
 * units and items are highlighted inline. Presentational (no `"use client"`);
 * sits at the bottom of the shared comp-detail page. Returns null when the comp
 * has no guide content at all.
 */
const PHASES = [
  { key: "earlyGame", label: "Início de jogo" },
  { key: "midGame", label: "Meio jogo" },
  { key: "lateGame", label: "Fim de jogo" },
] as const;

/** Unit (champion) and item names to highlight in the guide prose. */
function collectNames(comp: CompDetail): string[] {
  const names = new Set<string>();
  for (const unit of comp.units) {
    names.add(unit.champion.name);
    for (const compItem of unit.items) names.add(compItem.item.name);
  }
  for (const entry of comp.itemPriority) names.add(entry.item.name);
  return [...names];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split `text` into React nodes with any occurrence of a unit/item `name`
 * wrapped in a highlight `<mark>`. Longer names are matched first (so
 * "Aurelion Sol" wins over "Sol"), and matches must sit on letter/number
 * boundaries so a name is not highlighted inside a larger word.
 */
function highlightNames(text: string, names: string[]): ReactNode[] {
  const alternation = names
    .filter((name) => name.length > 0)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  if (alternation.length === 0) return [text];

  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <mark
        key={key++}
        className="rounded bg-primary/15 px-0.5 font-medium text-primary"
      >
        {match[0]}
      </mark>,
    );
    last = match.index + match[0].length;
    if (match.index === pattern.lastIndex) pattern.lastIndex++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Render guide prose: one paragraph per line, with names highlighted. */
function GuideText({ text, names }: { text: string; names: string[] }) {
  const paragraphs = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-sm leading-relaxed text-muted-foreground">
          {highlightNames(paragraph, names)}
        </p>
      ))}
    </>
  );
}

export function CompGuide({ comp }: { comp: CompDetail }) {
  const names = collectNames(comp);

  const whenToPlay = comp.whenToPlay?.trim();
  const tips = comp.tips?.trim();
  const phases = PHASES.flatMap((phase) => {
    const text = comp[phase.key]?.trim();
    return text ? [{ ...phase, text }] : [];
  });

  if (!whenToPlay && phases.length === 0 && !tips) return null;

  return (
    <>
      {whenToPlay && (
        <section
          aria-labelledby="when-to-play-heading"
          className="flex flex-col gap-3"
        >
          <SectionHeading id="when-to-play-heading">
            Quando jogar
          </SectionHeading>
          <GuideText text={whenToPlay} names={names} />
        </section>
      )}

      {phases.length > 0 && (
        <section
          aria-labelledby="how-to-play-heading"
          className="flex flex-col gap-4"
        >
          <SectionHeading id="how-to-play-heading">Como jogar</SectionHeading>
          <div className="flex flex-col gap-5">
            {phases.map((phase) => (
              <div key={phase.key} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {phase.label}
                </h3>
                <GuideText text={phase.text} names={names} />
              </div>
            ))}
          </div>
        </section>
      )}

      {tips && (
        <section aria-labelledby="tips-heading" className="flex flex-col gap-3">
          <SectionHeading id="tips-heading">Dicas</SectionHeading>
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <GuideText text={tips} names={names} />
          </div>
        </section>
      )}
    </>
  );
}

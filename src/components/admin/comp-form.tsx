"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Tier, Difficulty } from "@prisma/client";
import { createComp, updateComp, type CompFormInput } from "@/actions/comps";
import type { AdminCompEdit, PatchOption } from "@/server/queries/admin";
import { slugify } from "@/lib/slug";

/**
 * Admin comp base-fields form (US-034). Client component so it can:
 *  - preview/auto-derive the slug from the name (until the curator edits it),
 *  - call the `createComp`/`updateComp` server actions directly (React 18.3 has
 *    no `useActionState`, so we mirror the login form: `useState` + await the
 *    action, then navigate on success — see progress.txt US-030).
 * Traits/units/items/augments live in later stories; this form only owns the
 * scalar/guide fields + the two patch relations. A comp's moderation STATUS is
 * NOT edited here — it's driven by the publish/unpublish/archive controls
 * (US-038), which enforce FR-20 before a comp can go live.
 */

const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: "S", label: "S" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "X", label: "Situacional (X)" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "EASY", label: "Fácil" },
  { value: "MEDIUM", label: "Médio" },
  { value: "HARD", label: "Difícil" },
];

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2";
const labelClass = "flex flex-col gap-1 text-sm";
const labelText = "font-medium text-muted-foreground";

interface CompFormProps {
  patches: PatchOption[];
  /** Present in edit mode; omitted when creating. */
  comp?: AdminCompEdit;
}

/** Build the initial controlled values (nulls → "" for the inputs). */
function initialValues(comp?: AdminCompEdit): CompFormInput {
  return {
    name: comp?.name ?? "",
    slug: comp?.slug ?? "",
    tier: comp?.tier ?? "A",
    situational: comp?.situational ?? false,
    playstyle: comp?.playstyle ?? "",
    difficulty: comp?.difficulty ?? "MEDIUM",
    patchIntroducedId: comp?.patchIntroducedId ?? "",
    patchUpdatedId: comp?.patchUpdatedId ?? null,
    whenToPlay: comp?.whenToPlay ?? "",
    earlyGame: comp?.earlyGame ?? "",
    midGame: comp?.midGame ?? "",
    lateGame: comp?.lateGame ?? "",
    tips: comp?.tips ?? "",
  };
}

export function CompForm({ patches, comp }: CompFormProps) {
  const router = useRouter();
  const isEdit = Boolean(comp);

  const [values, setValues] = useState<CompFormInput>(() =>
    initialValues(comp),
  );
  // Once the curator edits the slug by hand, stop auto-deriving it from the
  // name. New comps start "untouched"; editing an existing comp keeps its slug.
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof CompFormInput>(
    key: K,
    value: CompFormInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onNameChange(name: string) {
    setValues((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugify(name),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = isEdit
      ? await updateComp(comp!.id, values)
      : await createComp(values);

    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    // Server data changed — refresh the (force-dynamic) list, then leave the
    // form. On create we go to the new comp's edit page so the curator can keep
    // filling in traits/units (US-035+); on edit we return to the list.
    router.push(isEdit ? "/admin/comps" : `/admin/comps/${result.id}`);
    router.refresh();
  }

  const previewSlug = values.slug || "—";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* Identity */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold text-foreground">
          Identidade
        </legend>

        <label className={labelClass}>
          <span className={labelText}>Nome</span>
          <input
            name="name"
            type="text"
            required
            value={values.name}
            onChange={(e) => onNameChange(e.target.value)}
            className={inputClass}
            placeholder="Ex.: N.O.V.A. Blitzcrank"
          />
        </label>

        <label className={labelClass}>
          <span className={labelText}>Slug</span>
          <input
            name="slug"
            type="text"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", slugify(e.target.value));
            }}
            className={inputClass}
            placeholder="gerado a partir do nome"
          />
          <span className="text-xs text-muted-foreground">
            URL pública: /comps/{previewSlug}
          </span>
        </label>
      </fieldset>

      {/* Classification */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="text-sm font-semibold text-foreground">
          Classificação
        </legend>

        <label className={labelClass}>
          <span className={labelText}>Tier</span>
          <select
            name="tier"
            value={values.tier}
            onChange={(e) => update("tier", e.target.value as Tier)}
            className={inputClass}
          >
            {TIER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelText}>Dificuldade</span>
          <select
            name="difficulty"
            value={values.difficulty}
            onChange={(e) => update("difficulty", e.target.value as Difficulty)}
            className={inputClass}
          >
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelText}>Estilo de jogo</span>
          <input
            name="playstyle"
            type="text"
            value={values.playstyle}
            onChange={(e) => update("playstyle", e.target.value)}
            className={inputClass}
            placeholder="Ex.: Fast 8, Slow Roll…"
          />
        </label>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            name="situational"
            type="checkbox"
            checked={values.situational}
            onChange={(e) => update("situational", e.target.checked)}
            className="h-4 w-4 rounded border-input bg-background text-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground">
            Comp situacional (depende do lobby/augments)
          </span>
        </label>
      </fieldset>

      {/* Patches */}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="text-sm font-semibold text-foreground">Patches</legend>

        <label className={labelClass}>
          <span className={labelText}>Introduzida no patch</span>
          <select
            name="patchIntroducedId"
            required
            value={values.patchIntroducedId}
            onChange={(e) => update("patchIntroducedId", e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {patches.map((p) => (
              <option key={p.id} value={p.id}>
                {p.version}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          <span className={labelText}>Atualizada no patch (opcional)</span>
          <select
            name="patchUpdatedId"
            value={values.patchUpdatedId ?? ""}
            onChange={(e) => update("patchUpdatedId", e.target.value || null)}
            className={inputClass}
          >
            <option value="">— Nenhum —</option>
            {patches.map((p) => (
              <option key={p.id} value={p.id}>
                {p.version}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {/* Guide */}
      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-semibold text-foreground">Guia</legend>

        <label className={labelClass}>
          <span className={labelText}>Quando jogar</span>
          <textarea
            name="whenToPlay"
            rows={3}
            value={values.whenToPlay}
            onChange={(e) => update("whenToPlay", e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            <span className={labelText}>Início de jogo</span>
            <textarea
              name="earlyGame"
              rows={4}
              value={values.earlyGame}
              onChange={(e) => update("earlyGame", e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className={labelText}>Meio de jogo</span>
            <textarea
              name="midGame"
              rows={4}
              value={values.midGame}
              onChange={(e) => update("midGame", e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            <span className={labelText}>Fim de jogo</span>
            <textarea
              name="lateGame"
              rows={4}
              value={values.lateGame}
              onChange={(e) => update("lateGame", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className={labelClass}>
          <span className={labelText}>Dicas</span>
          <textarea
            name="tips"
            rows={3}
            value={values.tips}
            onChange={(e) => update("tips", e.target.value)}
            className={inputClass}
          />
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Salvando…"
            : isEdit
              ? "Salvar alterações"
              : "Criar comp"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/comps")}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

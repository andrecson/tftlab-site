"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPatch } from "@/actions/patches";

/**
 * "New patch" form for the admin patches page (US-039). Client component so it
 * can call the `createPatch` server action directly (React 18.3 has no
 * `useActionState`, so we mirror the other admin forms: `useState` + await the
 * action, then `router.refresh()` on success). The `set` defaults to the current
 * set but stays editable so a curator can seed a patch for a new set.
 */

const inputClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2";
const labelClass = "flex flex-col gap-1 text-sm";
const labelText = "font-medium text-muted-foreground";

interface PatchFormProps {
  /** Current set token, used to pre-fill the set field. */
  currentSet: string | null;
}

export function PatchForm({ currentSet }: PatchFormProps) {
  const router = useRouter();
  const [version, setVersion] = useState("");
  const [releasedAt, setReleasedAt] = useState("");
  const [set, setSet] = useState(currentSet ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const result = await createPatch({ version, releasedAt, set });

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(`Patch ${version.trim()} criado.`);
    setVersion("");
    setReleasedAt("");
    // Refresh the force-dynamic page so the new patch appears in the list.
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card/40 p-5"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          <span className={labelText}>Versão</span>
          <input
            name="version"
            type="text"
            required
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className={inputClass}
            placeholder="Ex.: 17.3"
          />
        </label>

        <label className={labelClass}>
          <span className={labelText}>Lançamento</span>
          <input
            name="releasedAt"
            type="date"
            required
            value={releasedAt}
            onChange={(e) => setReleasedAt(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className={labelText}>Set</span>
          <input
            name="set"
            type="text"
            required
            value={set}
            onChange={(e) => setSet(e.target.value)}
            className={inputClass}
            placeholder="Ex.: TFTSet17"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando…" : "Criar patch"}
        </button>
      </div>
    </form>
  );
}

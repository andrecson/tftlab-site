"use client";

import { useMemo, useState } from "react";
import type { ItemType } from "@prisma/client";

import { updateItem } from "@/actions/catalog";
import type { AdminItem } from "@/server/queries/catalog";

/**
 * Admin item editor. Fixes the catalog items the API import got wrong (name,
 * icon, category) and lets a curator HIDE junk rows from the builder. Each row
 * owns its draft and calls `updateItem` on save; on success the parent list is
 * patched so search + filters stay consistent (same shape as the tier-list
 * editor). Search + a "só fora do builder" filter help find the rows to fix.
 *
 * A row is shown in the builder when it's `equippable` (passes the token/
 * placeholder heuristic) AND not `hidden`.
 */
const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  COMPONENT: "Componente",
  COMPLETED: "Craftável",
  ARTIFACT: "Artefato",
  RADIANT: "Radiante",
  EMBLEM: "Emblema",
  SUPPORT: "Suporte",
  OTHER: "Outro",
};
const ITEM_TYPES = Object.keys(ITEM_TYPE_LABEL) as ItemType[];

const inputClass =
  "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";

/** Whether the builder currently surfaces this item. */
function shownInBuilder(item: { equippable: boolean; hidden: boolean }): boolean {
  return item.equippable && !item.hidden;
}

export function ItemEditor({ items: initial }: { items: AdminItem[] }) {
  const [items, setItems] = useState<AdminItem[]>(initial);
  const [query, setQuery] = useState("");
  const [onlyHidden, setOnlyHidden] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (onlyHidden && shownInBuilder(item)) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.apiId.toLowerCase().includes(q)
      );
    });
  }, [items, query, onlyHidden]);

  function handleSaved(id: string, patch: ItemDraft) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
        Nenhum item no set atual. Importe o catálogo primeiro (botão “Re-importar
        catálogo”).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou apiId…"
          aria-label="Buscar item"
          className={`w-full max-w-sm ${inputClass} placeholder:text-muted-foreground`}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyHidden}
            onChange={(event) => setOnlyHidden(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Só itens fora do builder
        </label>
        <span className="text-sm text-muted-foreground">
          {filtered.length} de {items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          Nenhum item encontrado.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <ItemRow key={item.id} item={item} onSaved={handleSaved} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ItemDraft {
  name: string;
  iconUrl: string;
  type: ItemType;
  hidden: boolean;
}

interface ItemRowProps {
  item: AdminItem;
  onSaved: (id: string, patch: ItemDraft) => void;
}

function ItemRow({ item, onSaved }: ItemRowProps) {
  const [name, setName] = useState(item.name);
  const [iconUrl, setIconUrl] = useState(item.iconUrl);
  const [type, setType] = useState<ItemType>(item.type);
  const [hidden, setHidden] = useState(item.hidden);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== item.name ||
    iconUrl !== item.iconUrl ||
    type !== item.type ||
    hidden !== item.hidden;

  function touch() {
    setSaved(false);
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await updateItem(item.id, { name, iconUrl, type, hidden });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(item.id, { name, iconUrl, type, hidden });
    setSaved(true);
  }

  return (
    <li className="rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Plain <img>: the icon URL is arbitrary (curator-editable) and needs no
            optimization / domain whitelist. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl}
          alt=""
          width={40}
          height={40}
          className={`h-10 w-10 shrink-0 rounded bg-[#0a1322] object-contain ${
            hidden ? "opacity-40" : ""
          }`}
        />

        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            touch();
          }}
          aria-label={`Nome (${item.apiId})`}
          className={`min-w-0 flex-1 basis-48 ${inputClass}`}
        />

        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as ItemType);
            touch();
          }}
          aria-label={`Categoria (${item.apiId})`}
          className={`shrink-0 ${inputClass}`}
        >
          {ITEM_TYPES.map((value) => (
            <option key={value} value={value}>
              {ITEM_TYPE_LABEL[value]}
            </option>
          ))}
        </select>

        <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(event) => {
              setHidden(event.target.checked);
              touch();
            }}
            className="h-4 w-4 accent-primary"
          />
          Ocultar
        </label>

        {!item.equippable && (
          <span
            className="shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            title="O builder já ignora este item (token de campeão / placeholder)"
          >
            token/placeholder
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {error ? (
            <span role="alert" className="text-xs text-destructive">
              {error}
            </span>
          ) : null}
          {saved && !dirty ? (
            <span role="status" className="text-xs text-primary">
              salvo
            </span>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
          {item.apiId}
        </span>
        <input
          value={iconUrl}
          onChange={(event) => {
            setIconUrl(event.target.value);
            touch();
          }}
          aria-label={`URL do ícone (${item.apiId})`}
          className={`min-w-0 flex-1 ${inputClass} py-1 text-xs text-muted-foreground`}
        />
      </div>
    </li>
  );
}

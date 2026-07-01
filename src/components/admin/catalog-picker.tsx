"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * CatalogPicker — reusable admin autocomplete over catalog entities (US-032).
 *
 * A controlled combobox that searches Champion/Item/Trait/Augment entries by
 * name (each shown with its icon) and returns the selected id(s). It supports
 * BOTH single selection (`value: string | null`) and multiple selection
 * (`multiple + value: string[]`) via a discriminated union on `multiple`, so a
 * single component drives every relation in the admin comp forms (US-034..037):
 * one carry/patch (single) and lists of traits/units/items/augments (multiple).
 *
 * Design notes:
 * - Catalog data is normalized to `CatalogOption[]` (`{ id, name, iconUrl }`)
 *   by the caller — the picker is agnostic to which catalog table it draws from.
 * - Icons render via `next/image` (Community Dragon host is whitelisted in
 *   next.config); a plain <img> would trip the no-img-element lint gate.
 * - Accessible combobox: `role="combobox"` input wired to a `role="listbox"`
 *   via `aria-controls`/`aria-activedescendant`, options are `role="option"`.
 *   Keyboard: ↑/↓ move the active option, Enter selects, Esc closes,
 *   Backspace on an empty query removes the last selection.
 * - The results list is capped (`MAX_RESULTS`) so a 360-item catalog never
 *   floods the DOM; a hint prompts the user to refine when truncated.
 */

/** A normalized, icon-bearing catalog entry the picker can render/select. */
export interface CatalogOption {
  /** Stable id (the DB row id) returned via `onChange`. */
  id: string;
  /** Display name; the search matches against this. */
  name: string;
  /** Icon URL (Community Dragon CDN). */
  iconUrl: string;
  /** Optional secondary label (e.g. "Custo 4", item family, augment tier). */
  meta?: string;
}

interface BaseProps {
  /** Field label rendered above the control. */
  label: string;
  /** The full catalog to search/select from. */
  options: CatalogOption[];
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Message shown when the search matches nothing. */
  emptyLabel?: string;
  /** Disable the whole control. */
  disabled?: boolean;
  /** Optional helper text under the label. */
  hint?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  /** Selected id, or null when nothing is chosen. */
  value: string | null;
  /** Called with the new selection (or null when cleared). */
  onChange: (value: string | null) => void;
}

interface MultipleProps extends BaseProps {
  multiple: true;
  /** Selected ids, in selection order. */
  value: string[];
  /** Called with the new list of selected ids. */
  onChange: (value: string[]) => void;
}

export type CatalogPickerProps = SingleProps | MultipleProps;

/** Max options rendered in the dropdown at once (keeps the DOM light). */
const MAX_RESULTS = 50;

/** Small square icon for a chip/option, with a graceful blank fallback. */
function OptionIcon({
  src,
  size,
}: {
  src: string;
  size: number;
}) {
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded bg-muted"
      style={{ width: size, height: size }}
    >
      <Image src={src} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}

export function CatalogPicker(props: CatalogPickerProps) {
  const { label, options, placeholder, emptyLabel, disabled, hint } = props;
  const multiple = props.multiple === true;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;

  // Selected ids, normalized to an array regardless of single/multiple mode.
  // Memoized so downstream hooks (`selectedSet`) don't rerun every render.
  const selectedIds = useMemo<string[]>(
    () =>
      props.multiple ? props.value : props.value ? [props.value] : [],
    [props.multiple, props.value],
  );

  const optionsById = useMemo(() => {
    const map = new Map<string, CatalogOption>();
    for (const option of options) map.set(option.id, option);
    return map;
  }, [options]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Filter by name (multiple mode hides already-selected entries) and cap.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = multiple
      ? options.filter((option) => !selectedSet.has(option.id))
      : options;
    const matched = q
      ? base.filter((option) => option.name.toLowerCase().includes(q))
      : base;
    return matched.slice(0, MAX_RESULTS);
  }, [options, query, multiple, selectedSet]);

  const truncated = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = multiple
      ? options.filter((option) => !selectedSet.has(option.id))
      : options;
    const total = q
      ? base.filter((option) => option.name.toLowerCase().includes(q)).length
      : base.length;
    return total > MAX_RESULTS;
  }, [options, query, multiple, selectedSet]);

  // Keep the active option in range as the filtered list changes.
  useEffect(() => {
    setActiveIndex((index) =>
      filtered.length === 0 ? 0 : Math.min(index, filtered.length - 1),
    );
  }, [filtered]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function commitSelect(id: string) {
    if (props.multiple) {
      if (!props.value.includes(id)) props.onChange([...props.value, id]);
      setQuery("");
      setActiveIndex(0);
      inputRef.current?.focus();
    } else {
      props.onChange(id);
      setQuery("");
      setOpen(false);
    }
  }

  function commitRemove(id: string) {
    if (props.multiple) {
      props.onChange(props.value.filter((v) => v !== id));
    } else {
      props.onChange(null);
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        const option = filtered[activeIndex];
        if (open && option) {
          event.preventDefault();
          commitSelect(option.id);
        }
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case "Backspace":
        if (query === "" && selectedIds.length > 0) {
          commitRemove(selectedIds[selectedIds.length - 1]);
        }
        break;
      default:
        break;
    }
  }

  const activeOptionId =
    open && filtered[activeIndex]
      ? `${listboxId}-opt-${filtered[activeIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      {/* Current selection */}
      {selectedIds.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const option = optionsById.get(id);
            return (
              <li key={id}>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 py-1 pl-1 pr-1.5 text-sm text-foreground">
                  {option ? (
                    <>
                      <OptionIcon src={option.iconUrl} size={22} />
                      <span className="leading-tight">{option.name}</span>
                    </>
                  ) : (
                    <span className="leading-tight text-muted-foreground">
                      {/* Selected id no longer in the catalog */}
                      (desconhecido)
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => commitRemove(id)}
                    disabled={disabled}
                    aria-label={`Remover ${option?.name ?? "seleção"}`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Search input (combobox) */}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          disabled={disabled}
          value={query}
          placeholder={
            placeholder ??
            (multiple ? "Buscar e adicionar…" : "Buscar e selecionar…")
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />

        {open && !disabled ? (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                {emptyLabel ?? "Nenhum resultado."}
              </p>
            ) : (
              <ul
                id={listboxId}
                role="listbox"
                aria-label={label}
                className="max-h-64 overflow-y-auto py-1"
              >
                {filtered.map((option, index) => {
                  const active = index === activeIndex;
                  const isSelected = selectedSet.has(option.id);
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        id={`${listboxId}-opt-${option.id}`}
                        role="option"
                        aria-selected={isSelected}
                        // Prevent the input's blur/outside-close before click.
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => commitSelect(option.id)}
                        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors ${
                          active
                            ? "bg-primary/15 text-foreground"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <OptionIcon src={option.iconUrl} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate leading-tight">
                            {option.name}
                          </span>
                          {option.meta ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {option.meta}
                            </span>
                          ) : null}
                        </span>
                        {isSelected ? (
                          <span
                            aria-hidden="true"
                            className="text-xs font-semibold text-primary"
                          >
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
                {truncated ? (
                  <li
                    aria-hidden="true"
                    className="px-3 py-1.5 text-center text-xs text-muted-foreground"
                  >
                    Refine a busca para ver mais resultados.
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

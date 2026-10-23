import type { Criterion } from "@/lib/types";

export type RawCriterion = { id?: string; label?: string; source?: string };

function shortLabel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return words.join(" ");
}

/**
 * The model names its own criterion ids, and those names only mean something
 * inside its own answer. Renumber them here so the panel and the scenes can
 * never disagree, and keep a lookup that accepts either a raw id or a label.
 */
export function normalizeCriteria(raw: RawCriterion[] | undefined): {
  criteria: Criterion[];
  idFor: (reference: string) => string | undefined;
} {
  const criteria: Criterion[] = [];
  const byRawId = new Map<string, string>();
  const byLabel = new Map<string, string>();

  for (const item of raw ?? []) {
    const source = typeof item.source === "string" ? item.source.trim() : "";
    const label =
      (typeof item.label === "string" && item.label.trim()) || shortLabel(source);
    if (!label) continue;

    const key = label.toLowerCase();
    const existing = byLabel.get(key);
    if (existing) {
      if (item.id) byRawId.set(item.id, existing);
      continue;
    }

    const id = `c${criteria.length + 1}`;
    criteria.push({ id, label, source: source || label });
    byLabel.set(key, id);
    if (item.id) byRawId.set(item.id, id);
  }

  function idFor(reference: string): string | undefined {
    return byRawId.get(reference) ?? byLabel.get(reference.trim().toLowerCase());
  }

  return { criteria, idFor };
}

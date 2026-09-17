export type QuickFindKind =
  | "CLIENT"
  | "STAFF"
  | "INCIDENT"
  | "COMPLAINT"
  | "SAFEGUARDING"
  | "ACTION"
  | "RISK"
  | "EVIDENCE";

export type QuickFindItem = {
  id: string;
  kind: QuickFindKind;
  label: string;
  reference: string | null;
  meta: string;
  href: string;
  search: string[];
};

export function rankQuickFindItems(query: string, items: QuickFindItem[], limit = 5) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  return items
    .map((item) => ({ item, rank: Math.min(...item.search.map((value) => fieldRank(normalizedQuery, normalize(value)))) }))
    .filter((result) => Number.isFinite(result.rank))
    .sort((a, b) => a.rank - b.rank || a.item.label.localeCompare(b.item.label) || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map(({ item }) => ({ id: item.id, kind: item.kind, label: item.label, reference: item.reference, meta: item.meta, href: item.href }));
}

function fieldRank(query: string, value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === query) return 0;
  if (value.startsWith(query)) return 1;
  if (value.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  if (value.includes(query)) return 3;
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => value.includes(token)) ? 4 : Number.POSITIVE_INFINITY;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
}

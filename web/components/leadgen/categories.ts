/** Category metadata mirrored from legacy index.html */
export const CAT_META: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  closed: { label: "Закрытые/SQL", bg: "bg-good/30", text: "text-good" },
  calls: { label: "Звонки MQL", bg: "bg-info/30", text: "text-info" },
  special: { label: "Special", bg: "bg-special/30", text: "text-special" },
  mentoring: { label: "Менторство", bg: "bg-warn/30", text: "text-warn" },
  other: { label: "Прочее", bg: "bg-muted", text: "text-muted-foreground" },
};

export const CAT_KEYS = Object.keys(CAT_META);

export function catMeta(key: string) {
  return CAT_META[key] ?? CAT_META.other;
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSection } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  DealInsert,
  DealUpdate,
  ProjectRevenueInsert,
  Uuid,
} from "@/lib/schemas";
import { MONTHS } from "@/lib/months";

const sb = () => createServerSupabase();

/* ─── deals ──────────────────────────────────────────────────────────── */

export async function createDeal(formData: FormData) {
  await requireSection("leadgen");

  const parsed = DealInsert.safeParse({
    project: formData.get("project"),
    leadgen: formData.get("leadgen") || null,
    month: formData.get("month"),
    year: Number(formData.get("year")),
    bonus: Number(formData.get("bonus")),
    revenue: formData.get("revenue") || null,
    comment: formData.get("comment") || null,
    deal_type: (formData.get("deal_type") as string) || "sql",
  });
  if (!parsed.success) {
    console.error("createDeal invalid", parsed.error);
    throw new Error("Invalid deal data");
  }

  const { error } = await sb().from("deals").insert(parsed.data);
  if (error) throw error;
  revalidatePath("/leadgen/deals");
}

const DealFieldPatch = z.object({
  field: z.enum([
    "project",
    "leadgen",
    "month",
    "year",
    "bonus",
    "revenue",
    "comment",
    "deal_type",
  ]),
  value: z.union([z.string(), z.number(), z.null()]),
});

export async function patchDeal(
  id: string,
  field: string,
  rawValue: unknown,
) {
  await requireSection("leadgen");
  Uuid.parse(id);

  let value: string | number | null =
    rawValue === "" ? null : (rawValue as string | number);
  if (field === "year" || field === "bonus") {
    value = Number(value);
    if (isNaN(value)) value = 0;
  }

  const parsed = DealFieldPatch.parse({ field, value });
  const update = DealUpdate.parse({ [parsed.field]: parsed.value });

  const { error } = await sb()
    .from("deals")
    .update(update)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/leadgen/deals");
}

export async function deleteDeal(id: string) {
  await requireSection("leadgen");
  Uuid.parse(id);
  const { error } = await sb().from("deals").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/leadgen/deals");
}

/* ─── project revenues ──────────────────────────────────────────────── */

export async function createRevenue(formData: FormData) {
  await requireSection("leadgen");

  const parsed = ProjectRevenueInsert.safeParse({
    project_name: formData.get("project_name"),
    month: formData.get("month"),
    year: Number(formData.get("year")),
    amount: Number(formData.get("amount")),
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    console.error("createRevenue invalid", parsed.error);
    throw new Error("Invalid revenue data");
  }

  const { error } = await sb().from("project_revenues").insert(parsed.data);
  if (error) throw error;
  revalidatePath("/leadgen/revenue");
  revalidatePath("/leadgen/deals"); // deal revenue auto-fills from this
}

export async function deleteRevenue(id: string) {
  await requireSection("leadgen");
  Uuid.parse(id);
  const { error } = await sb()
    .from("project_revenues")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/leadgen/revenue");
  revalidatePath("/leadgen/deals");
}

/* ─── CSV import for deals ──────────────────────────────────────────── */

export type ImportDealsResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

const NormalizedMonth = z.string().transform((raw) => {
  const trimmed = raw.trim();
  // Accept full Russian names ("Январь") and 3-letter prefixes ("Янв")
  const lower = trimmed.toLowerCase();
  for (const m of MONTHS) {
    if (m.toLowerCase() === lower) return m;
    if (m.toLowerCase().startsWith(lower)) return m;
  }
  // Accept numeric 1-12
  const n = Number(trimmed);
  if (!isNaN(n) && n >= 1 && n <= 12) return MONTHS[n - 1];
  throw new Error(`bad month: "${raw}"`);
});

const Row = z.object({
  project: z.string().min(1).max(200),
  leadgen: z.string().max(100).optional().or(z.literal("")),
  month: NormalizedMonth,
  year: z.coerce.number().int().min(2020).max(2100),
  bonus: z.coerce.number().default(0),
  revenue: z.coerce.string().optional().or(z.literal("")),
  comment: z.string().max(1000).optional().or(z.literal("")),
  deal_type: z.enum(["sql", "closed"]).default("closed"),
});

function parseCsv(text: string): Array<Record<string, string>> {
  // Lightweight CSV parser: handles , and ; separators, optional quotes,
  // CRLF/LF, and a header row. No support for embedded commas inside
  // quoted fields with escaped quotes — but covers the common Excel/Google
  // Sheets export.
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const splitRow = (row: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase());
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    out.push(row);
  }
  return out;
}

const HEADER_ALIASES: Record<string, string[]> = {
  project: ["project", "проект", "название", "name"],
  leadgen: ["leadgen", "лидген", "лидген (имя)", "name leadgen"],
  month: ["month", "месяц"],
  year: ["year", "год"],
  bonus: ["bonus", "бонус", "amount", "сумма"],
  revenue: ["revenue", "ревеню", "доход"],
  comment: ["comment", "комментарий", "note"],
  deal_type: ["deal_type", "тип", "type"],
};

function pick(row: Record<string, string>, key: keyof typeof HEADER_ALIASES) {
  for (const alias of HEADER_ALIASES[key]) {
    if (alias in row && row[alias] !== "") return row[alias];
  }
  return "";
}

export async function importDeals(formData: FormData): Promise<ImportDealsResult> {
  await requireSection("leadgen");

  const file = formData.get("file");
  const defaultType = (formData.get("deal_type") as string) || "closed";
  if (!(file instanceof File)) {
    return { inserted: 0, updated: 0, skipped: 0, errors: ["No file provided"] };
  }

  const text = await file.text();
  const rows = parseCsv(text);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Pull existing deals once for upsert-by-(project,month,year,deal_type)
  const { data: existing, error: exErr } = await sb()
    .from("deals")
    .select("id,project,month,year,deal_type");
  if (exErr) {
    return { inserted: 0, updated: 0, skipped: 0, errors: [exErr.message] };
  }
  const exMap = new Map<string, string>();
  for (const d of existing ?? []) {
    const key = `${d.project.toLowerCase().trim()}|${d.month}|${d.year ?? ""}|${d.deal_type ?? "sql"}`;
    exMap.set(key, d.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const dealTypeRaw = pick(r, "deal_type") || defaultType;
    const parsed = Row.safeParse({
      project: pick(r, "project"),
      leadgen: pick(r, "leadgen"),
      month: pick(r, "month"),
      year: pick(r, "year"),
      bonus: pick(r, "bonus") || "0",
      revenue: pick(r, "revenue"),
      comment: pick(r, "comment"),
      deal_type: dealTypeRaw === "sql" ? "sql" : "closed",
    });
    if (!parsed.success) {
      skipped++;
      errors.push(`Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    const data = parsed.data;
    const key = `${data.project.toLowerCase().trim()}|${data.month}|${data.year}|${data.deal_type}`;
    const existingId = exMap.get(key);

    const payload = {
      project: data.project,
      leadgen: data.leadgen || null,
      month: data.month,
      year: data.year,
      bonus: data.bonus,
      revenue: data.revenue || null,
      comment: data.comment || null,
      deal_type: data.deal_type,
    };

    if (existingId) {
      const { error } = await sb()
        .from("deals")
        .update(payload)
        .eq("id", existingId);
      if (error) {
        skipped++;
        errors.push(`Row ${i + 2}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      const { error } = await sb().from("deals").insert(payload);
      if (error) {
        skipped++;
        errors.push(`Row ${i + 2}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  revalidatePath("/leadgen/deals");
  return { inserted, updated, skipped, errors: errors.slice(0, 8) };
}

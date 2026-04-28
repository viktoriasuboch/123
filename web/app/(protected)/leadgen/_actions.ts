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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSection } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  ProjectInsert,
  ProjectUpdate,
  ProjectMemberInsert,
  ProjectMemberUpdate,
  ProjectEventInsert,
  Uuid,
} from "@/lib/schemas";
import { MONTHS } from "@/lib/months";

const sb = () => createServerSupabase();

/* ─── projects ──────────────────────────────────────────────────────── */

export async function createProject(formData: FormData) {
  await requireSection("projects");
  const parsed = ProjectInsert.safeParse({
    name: formData.get("name"),
    status: formData.get("status") || "active",
    start_date: formData.get("start_date") || null,
    expected_duration: formData.get("expected_duration") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) throw new Error("Invalid project data");

  const { data, error } = await sb()
    .from("projects")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) throw error;

  // Auto-create a matching closed-deal placeholder in Leadgen so the
  // project shows up there immediately. Bonus/leadgen are empty —
  // they'll be filled later by hand or via the CSV import.
  const now = new Date();
  const monthOfStart = parsed.data.start_date
    ? new Date(parsed.data.start_date).getMonth()
    : now.getMonth();
  const yearOfStart = parsed.data.start_date
    ? new Date(parsed.data.start_date).getFullYear()
    : now.getFullYear();

  const { error: dealErr } = await sb().from("deals").insert({
    project: parsed.data.name,
    leadgen: null,
    month: MONTHS[monthOfStart],
    year: yearOfStart,
    bonus: 0,
    revenue: null,
    comment: "Авто-создан из Projects",
    deal_type: "closed",
  });
  if (dealErr) {
    console.error("Failed to auto-create closed deal", dealErr);
    // Non-fatal — project itself is created.
  }

  revalidatePath("/projects");
  revalidatePath("/leadgen/deals");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  await requireSection("projects");
  Uuid.parse(id);
  const parsed = ProjectUpdate.safeParse({
    name: formData.get("name") ?? undefined,
    status: formData.get("status") ?? undefined,
    start_date: formData.get("start_date") || null,
    expected_duration: formData.get("expected_duration") || null,
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) throw new Error("Invalid project update");

  const { error } = await sb()
    .from("projects")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw error;

  await sb().from("project_events").insert({
    project_id: id,
    event_type: "note",
    description: "Параметры проекта обновлены",
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

const ProjectNamePatch = z.object({ name: z.string().min(1).max(200) });
export async function renameProject(id: string, name: string) {
  await requireSection("projects");
  const parsed = ProjectNamePatch.parse({ name });

  // Read the old name first so we can rename the deals' project field too
  const { data: prev } = await sb()
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb()
    .from("projects")
    .update(parsed)
    .eq("id", id);
  if (error) throw error;

  // Mirror the rename to deals (case-insensitive match on the previous name)
  if (prev?.name && prev.name !== parsed.name) {
    const { error: dealErr } = await sb()
      .from("deals")
      .update({ project: parsed.name })
      .ilike("project", prev.name);
    if (dealErr) console.error("Failed to rename deals", dealErr);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  revalidatePath("/leadgen/deals");
}

export async function deleteProject(id: string) {
  await requireSection("projects");
  Uuid.parse(id);
  // CASCADE removes project_members and project_events
  const { error } = await sb().from("projects").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/projects");
  redirect("/projects");
}

const StatusPatch = z.object({
  status: z.enum(["active", "completed", "paused"]),
});

export async function setProjectStatus(
  id: string,
  status: "active" | "completed" | "paused",
) {
  await requireSection("projects");
  Uuid.parse(id);
  const parsed = StatusPatch.parse({ status });

  const { error } = await sb()
    .from("projects")
    .update(parsed)
    .eq("id", id);
  if (error) throw error;

  await sb().from("project_events").insert({
    project_id: id,
    event_type: "status_change",
    description:
      status === "completed"
        ? "Проект завершён"
        : status === "active"
          ? "Проект возобновлён"
          : "Проект приостановлен",
  });

  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
}

/* ─── members ───────────────────────────────────────────────────────── */

export async function addMember(projectId: string, formData: FormData) {
  await requireSection("projects");
  Uuid.parse(projectId);

  const parsed = ProjectMemberInsert.safeParse({
    project_id: projectId,
    dev_name: formData.get("dev_name"),
    role: formData.get("role") || null,
    employment_type: (formData.get("employment_type") as string) || "freelancer",
    buy_rate: Number(formData.get("buy_rate") ?? 0),
    sell_rate: Number(formData.get("sell_rate") ?? 0),
    salary: Number(formData.get("salary") ?? 0),
    hours_load: Number(formData.get("hours_load") ?? 0),
    dev_start_date: formData.get("dev_start_date") || null,
    dev_end_date: formData.get("dev_end_date") || null,
    is_active: true,
  });
  if (!parsed.success) {
    console.error("addMember invalid", parsed.error);
    throw new Error("Invalid member data");
  }

  const { error } = await sb().from("project_members").insert(parsed.data);
  if (error) throw error;

  await sb().from("project_events").insert({
    project_id: projectId,
    event_type: "join",
    description: `Добавлен ${parsed.data.dev_name} (${parsed.data.role || "—"})`,
  });

  revalidatePath(`/projects/${projectId}`);
}

const MemberFieldPatch = z.object({
  field: z.enum([
    "dev_name",
    "role",
    "employment_type",
    "buy_rate",
    "sell_rate",
    "salary",
    "hours_load",
    "dev_start_date",
    "dev_end_date",
    "is_active",
  ]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export async function patchMember(
  projectId: string,
  memberId: string,
  field: string,
  rawValue: unknown,
) {
  await requireSection("projects");
  Uuid.parse(memberId);
  Uuid.parse(projectId);

  let value: string | number | boolean | null = rawValue as
    | string
    | number
    | boolean
    | null;
  if (
    field === "buy_rate" ||
    field === "sell_rate" ||
    field === "salary" ||
    field === "hours_load"
  ) {
    value = Number(value);
    if (isNaN(value as number)) value = 0;
  }
  if (value === "" && (field.endsWith("_date") || field === "role")) value = null;

  const parsed = MemberFieldPatch.parse({ field, value });
  const update = ProjectMemberUpdate.parse({ [parsed.field]: parsed.value });

  const { error } = await sb()
    .from("project_members")
    .update(update)
    .eq("id", memberId);
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
}

export async function removeMember(projectId: string, memberId: string, devName?: string) {
  await requireSection("projects");
  Uuid.parse(projectId);
  Uuid.parse(memberId);

  const { error } = await sb()
    .from("project_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;

  await sb().from("project_events").insert({
    project_id: projectId,
    event_type: "leave",
    description: `Удалён ${devName ?? "участник"}`,
  });

  revalidatePath(`/projects/${projectId}`);
}

/* ─── events ────────────────────────────────────────────────────────── */

export async function addProjectNote(projectId: string, description: string) {
  await requireSection("projects");
  Uuid.parse(projectId);

  const parsed = ProjectEventInsert.parse({
    project_id: projectId,
    event_type: "note",
    description,
  });

  const { error } = await sb().from("project_events").insert(parsed);
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectEvent(projectId: string, eventId: string) {
  await requireSection("projects");
  Uuid.parse(projectId);
  Uuid.parse(eventId);

  const { error } = await sb()
    .from("project_events")
    .delete()
    .eq("id", eventId);
  if (error) throw error;

  revalidatePath(`/projects/${projectId}`);
}

/* ─── developer status ──────────────────────────────────────────────── */

export async function setDevStatus(
  devName: string,
  status: "active" | "inactive",
) {
  await requireSection("projects");
  z.string().min(1).max(120).parse(devName);

  const { error } = await sb()
    .from("developer_status")
    .upsert(
      { dev_name: devName, status, updated_at: new Date().toISOString() },
      { onConflict: "dev_name" },
    );
  if (error) throw error;

  revalidatePath("/projects");
  revalidatePath(`/projects/devs/${encodeURIComponent(devName)}`);
}

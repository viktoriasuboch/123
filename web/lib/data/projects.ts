import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  Project,
  ProjectMember,
  ProjectEvent,
  DevStatus,
} from "@/lib/schemas";
import { z } from "zod";

const sb = () => createServerSupabase();

/* ── reads ──────────────────────────────────────────────────────────── */

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await sb()
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return z.array(Project).parse(data ?? []);
}

export async function listProjectMembers(): Promise<ProjectMember[]> {
  const { data, error } = await sb()
    .from("project_members")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return z.array(ProjectMember).parse(data ?? []);
}

export async function listProjectEvents(): Promise<ProjectEvent[]> {
  const { data, error } = await sb()
    .from("project_events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return z.array(ProjectEvent).parse(data ?? []);
}

export async function listDevStatuses(): Promise<Record<string, DevStatus>> {
  const { data, error } = await sb()
    .from("developer_status")
    .select("*");
  if (error) throw error;
  const arr = z.array(DevStatus).parse(data ?? []);
  return Object.fromEntries(arr.map((d) => [d.dev_name, d]));
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await sb()
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? Project.parse(data) : null;
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await sb()
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return z.array(ProjectMember).parse(data ?? []);
}

export async function getProjectEvents(projectId: string): Promise<ProjectEvent[]> {
  const { data, error } = await sb()
    .from("project_events")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return z.array(ProjectEvent).parse(data ?? []);
}

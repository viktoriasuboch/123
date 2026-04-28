import "server-only";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { Person, Entry, Deal, Salary, ProjectRevenue } from "@/lib/schemas";

const sb = () => createServerSupabase();

export async function listPeople(): Promise<Person[]> {
  const { data, error } = await sb()
    .from("people")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return z.array(Person).parse(data ?? []);
}

export async function listEntries(): Promise<Entry[]> {
  const { data, error } = await sb()
    .from("entries")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return z.array(Entry).parse(data ?? []);
}

export async function listDeals(): Promise<Deal[]> {
  const { data, error } = await sb()
    .from("deals")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return z.array(Deal).parse(data ?? []);
}

export async function listSalaries(): Promise<Salary[]> {
  const { data, error } = await sb()
    .from("salaries")
    .select("*")
    .order("year", { ascending: true })
    .order("month", { ascending: true });
  if (error) throw error;
  return z.array(Salary).parse(data ?? []);
}

export async function listProjectRevenues(): Promise<ProjectRevenue[]> {
  const { data, error } = await sb()
    .from("project_revenues")
    .select("*")
    .order("year", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return z.array(ProjectRevenue).parse(data ?? []);
}

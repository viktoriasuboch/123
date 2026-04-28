"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const TABLES = ["projects", "project_members", "project_events", "developer_status"];

/**
 * Mount near the top of any projects-section page.
 * On any postgres_changes event for the watched tables, calls
 * router.refresh() so the parent Server Component re-runs its fetch.
 */
export function ProjectsRealtime() {
  const router = useRouter();

  useEffect(() => {
    const sb = getBrowserSupabase();
    const ch = sb.channel("projects-rt");
    for (const t of TABLES) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        () => router.refresh(),
      );
    }
    ch.subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [router]);

  return null;
}

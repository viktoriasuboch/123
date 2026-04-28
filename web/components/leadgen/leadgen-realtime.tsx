"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

const TABLES = ["people", "entries", "deals", "salaries", "project_revenues"];

export function LeadgenRealtime() {
  const router = useRouter();
  useEffect(() => {
    const sb = getBrowserSupabase();
    const ch = sb.channel("leadgen-rt");
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

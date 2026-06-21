"use client";

import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";

/** Poll the live feed the console renders. Defaults to a 1.5s cadence. */
export function useSessions(intervalMs = 1500): Session[] {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { sessions?: Session[] };
        if (active && Array.isArray(data.sessions)) setSessions(data.sessions);
      } catch {
        // transient — keep the last good state and try again next tick.
      }
    }
    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return sessions;
}

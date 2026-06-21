"use client";

import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";

/** Poll the live feed. Simple and robust for a PoC; swap for SSE/Pusher later. */
export function useSessions(intervalMs = 1500): Session[] {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        const data = (await res.json()) as { sessions: Session[] };
        if (alive) setSessions(data.sessions);
      } catch {
        /* transient — next tick retries */
      }
    };
    pull();
    const id = setInterval(pull, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return sessions;
}

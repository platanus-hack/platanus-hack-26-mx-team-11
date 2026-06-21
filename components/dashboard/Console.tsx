"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSessions } from "@/lib/client/useSessions";
import { C, SEV, severityForScore } from "@/components/dashboard/theme";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { SessionRow } from "@/components/dashboard/SessionRow";
import { Replay } from "@/components/dashboard/Replay";
import { logout } from "@/app/(auth)/actions";
import type { RiskSeverity, Session } from "@/lib/types";

export interface ConsoleViewer {
  name: string;
  orgName: string;
}

type SevFilter = RiskSeverity | "all";
const SEV_ORDER: RiskSeverity[] = ["critical", "high", "medium", "low"];

export function Console({ viewer }: { viewer?: ConsoleViewer | null }) {
  const sessions = useSessions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Counts per severity for the filter chips (off the full, unfiltered list).
  const sevCounts = useMemo(() => {
    const c: Record<RiskSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const s of sessions) c[severityForScore(s.riskScore)]++;
    return c;
  }, [sessions]);

  const filtered = useMemo(
    () => (sevFilter === "all" ? sessions : sessions.filter((s) => severityForScore(s.riskScore) === sevFilter)),
    [sessions, sevFilter]
  );
  const activeSessions = useMemo(() => filtered.filter((s) => s.status === "active"), [filtered]);
  const endedSessions = useMemo(() => filtered.filter((s) => s.status !== "active"), [filtered]);

  // Keep a valid selection as the live/filtered list changes.
  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? filtered[0],
    [filtered, selectedId]
  );

  return (
    <div style={st.root}>
      <DashboardNav
        title="Console"
        badge="Security console"
        brandSize={30}
        brandPulse
        right={
          <>
            <div style={st.clock}>
              <span className="cs-live" style={st.liveDot} />
              <span style={{ fontFamily: "var(--mono)" }}>{clock}</span>
            </div>
            {viewer && (
              <form action={logout} style={st.account}>
                <span style={st.accountName}>{viewer.name}{viewer.orgName ? ` · ${viewer.orgName}` : ""}</span>
                <button type="submit" style={st.signOut}>Sign out</button>
              </form>
            )}
          </>
        }
      />

      <StatStrip sessions={sessions} />

      <div style={st.body}>
        <section style={st.left} className="cs-left">
          <div style={st.colHead}>
            <span>Sessions</span>
            <span style={st.colHeadHint}>{filtered.length}{sevFilter !== "all" ? ` of ${sessions.length}` : ""} shown</span>
          </div>

          <div style={st.filterBar}>
            <FilterChip label="All" count={sessions.length} active={sevFilter === "all"} onClick={() => setSevFilter("all")} />
            {SEV_ORDER.map((sev) => (
              <FilterChip
                key={sev}
                label={SEV[sev].label}
                count={sevCounts[sev]}
                color={SEV[sev].color}
                active={sevFilter === sev}
                onClick={() => setSevFilter((f) => (f === sev ? "all" : sev))}
              />
            ))}
          </div>

          <div style={st.feed}>
            {sessions.length === 0 ? (
              <div style={st.empty}>Waiting for the first session…</div>
            ) : filtered.length === 0 ? (
              <div style={st.empty}>No sessions at this severity.</div>
            ) : (
              <>
                <SessionGroup
                  title="Active"
                  live
                  sessions={activeSessions}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                />
                <SessionGroup
                  title="Ended"
                  sessions={endedSessions}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                />
              </>
            )}
          </div>
        </section>

        <section style={st.right} className="cs-right">
          {selected ? <Replay session={selected} /> : <div style={st.empty}>No sessions yet.</div>}
        </section>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  const accent = color ?? C.text;
  return (
    <button
      onClick={onClick}
      style={{
        ...st.chip,
        borderColor: active ? accent : C.borderSoft,
        background: active ? `${accent}1A` : "transparent",
        color: active ? C.text : C.muted,
      }}
    >
      {color && <span style={{ ...st.chipDot, background: color }} />}
      {label}
      <span style={st.chipCount}>{count}</span>
    </button>
  );
}

function SessionGroup({
  title,
  live,
  sessions,
  selectedId,
  onSelect,
}: {
  title: string;
  live?: boolean;
  sessions: Session[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={st.group}>
      <div style={st.groupHead}>
        {live && <span className="cs-live" style={st.groupLiveDot} />}
        <span style={live ? st.groupTitleLive : st.groupTitle}>{title}</span>
        <span style={st.groupCount}>{sessions.length}</span>
      </div>
      {sessions.length === 0 ? (
        <div style={st.groupEmpty}>{live ? "No active sessions." : "Nothing ended yet."}</div>
      ) : (
        <div style={st.groupList}>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              active={s.id === selectedId}
              flagCount={s.events.reduce((n, e) => n + e.flags.length, 0)}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  root: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "var(--ui)", border: `1px solid ${C.border}` },
  clock: { fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", gap: 7 },
  account: { display: "flex", alignItems: "center", gap: 10 },
  accountName: { fontSize: 12, color: C.faint },
  signOut: { background: "transparent", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)" },
  liveDot: { width: 7, height: 7, borderRadius: "50%", background: "#FF5160", display: "inline-block" },
  body: { display: "flex", gap: 1, background: C.border, minHeight: 420 },
  left: { background: C.bg, display: "flex", flexDirection: "column", width: 340, flexShrink: 0 },
  right: { background: C.bg, display: "flex", flexDirection: "column", flex: 1 },
  colHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `1px solid ${C.borderSoft}` },
  colHeadHint: { color: C.faint, fontWeight: 500, textTransform: "none", letterSpacing: 0 },

  filterBar: { display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px", borderBottom: `1px solid ${C.borderSoft}` },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid", borderRadius: 20, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--ui)", transition: "background .15s, border-color .15s, color .15s" },
  chipDot: { width: 7, height: 7, borderRadius: "50%", display: "inline-block" },
  chipCount: { fontSize: 10.5, color: C.faint, fontFamily: "var(--mono)" },

  feed: { padding: 10, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" },
  group: { display: "flex", flexDirection: "column", gap: 8 },
  groupHead: { display: "flex", alignItems: "center", gap: 7, padding: "2px 4px", position: "sticky", top: 0, background: C.bg, zIndex: 1 },
  groupTitle: { fontSize: 10.5, fontWeight: 700, color: C.faint, textTransform: "uppercase", letterSpacing: "0.07em" },
  groupTitleLive: { fontSize: 10.5, fontWeight: 700, color: "#FF8088", textTransform: "uppercase", letterSpacing: "0.07em" },
  groupLiveDot: { width: 7, height: 7, borderRadius: "50%", background: "#FF5160", display: "inline-block" },
  groupCount: { fontSize: 10.5, fontFamily: "var(--mono)", color: C.faint, border: `1px solid ${C.borderSoft}`, borderRadius: 20, padding: "0 7px", marginLeft: 2 },
  groupList: { display: "flex", flexDirection: "column", gap: 8 },
  groupEmpty: { fontSize: 12, color: C.faint, padding: "4px 6px 2px" },
  empty: { padding: 40, color: C.faint, fontSize: 14 },
};

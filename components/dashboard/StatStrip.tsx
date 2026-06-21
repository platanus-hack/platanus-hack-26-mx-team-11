import type { CSSProperties } from "react";
import type { RiskCategory, Session } from "@/lib/types";
import { C, SEV, riskBand, riskColor } from "@/components/dashboard/theme";

const CATEGORY: Record<RiskCategory, { label: string; color: string }> = {
  policy: { label: "Policy", color: "#FF9F40" },
  pii: { label: "PII", color: "#FF5160" },
  insecure: { label: "Insecure", color: "#FFD23F" },
  injection: { label: "Injection", color: "#8C9CFF" },
};

/** A rigorous, non-saturating read on the org: four headline numbers plus a
 *  one-line breakdown of what kind of risk is open right now. */
export function StatStrip({ sessions }: { sessions: Session[] }) {
  const active = sessions.filter((s) => s.status === "active").length;
  const flags = sessions.flatMap((s) => s.events.flatMap((e) => e.flags));
  const critical = sessions.filter((s) => s.riskScore >= 75).length;
  const avgRisk = sessions.length
    ? Math.round(sessions.reduce((a, s) => a + s.riskScore, 0) / sessions.length)
    : 0;

  const byCategory = (Object.keys(CATEGORY) as RiskCategory[])
    .map((cat) => ({ cat, n: flags.filter((f) => f.category === cat).length }))
    .filter((c) => c.n > 0);

  return (
    <div style={st.wrap}>
      <div style={st.stats}>
        <Stat label="Active sessions" value={active} accent={C.accent} />
        <Stat label="Avg risk" value={avgRisk} accent={riskColor(avgRisk)} suffix={`· ${riskBand(avgRisk)}`} />
        <Stat label="Open flags" value={flags.length} accent={flags.length ? SEV.high.color : C.accent} />
        <Stat label="Critical sessions" value={critical} accent={critical ? SEV.critical.color : SEV.low.color} />
      </div>
      {byCategory.length > 0 && (
        <div style={st.breakdown}>
          <span style={st.breakdownLabel}>Open by type</span>
          {byCategory.map(({ cat, n }) => (
            <span key={cat} style={st.cat}>
              <span style={{ ...st.catDot, background: CATEGORY[cat].color }} />
              {n} {CATEGORY[cat].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent, suffix }: { label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div style={st.stat}>
      <div style={st.statLabel}>{label}</div>
      <div style={{ ...st.statValue, color: accent }}>
        {value}
        {suffix && <span style={st.suffix}>{suffix}</span>}
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  wrap: { borderBottom: `1px solid ${C.border}` },
  stats: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: C.border },
  stat: { background: C.panel2, padding: "13px 18px" },
  statLabel: { fontSize: 11, color: C.muted, letterSpacing: "0.03em", textTransform: "uppercase" },
  statValue: { fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", marginTop: 3, lineHeight: 1 },
  suffix: { fontSize: 12, color: C.faint, fontWeight: 500, marginLeft: 6, fontFamily: "var(--ui)" },
  breakdown: { display: "flex", alignItems: "center", gap: 16, padding: "9px 18px", background: C.panel2, borderTop: `1px solid ${C.borderSoft}`, flexWrap: "wrap" },
  breakdownLabel: { fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: "0.05em" },
  cat: { display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted },
  catDot: { width: 8, height: 8, borderRadius: "50%" },
};

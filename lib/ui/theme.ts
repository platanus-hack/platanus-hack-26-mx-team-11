/**
 * Design tokens + small presentational helpers. The console runs on the dark
 * palette; `components/dashboard/theme.ts` re-exports `dark` as `C`.
 */
import type { EventType, RiskCategory, RiskSeverity } from "@/lib/types";

export const dark = {
  bg: "#0B0F14",
  panel: "#121A24",
  panel2: "#0F151D",
  raised: "#16202C",
  border: "#1E2A38",
  borderSoft: "#172230",
  text: "#E6EDF3",
  muted: "#8A9BA8",
  faint: "#5A6B7A",
  accent: "#34E5D0",
  accentInk: "#06231F",
} as const;

/** Light palette for marketing surfaces (kept minimal — exported for parity). */
export const light = {
  bg: "#FFFFFF",
  panel: "#F6F8FA",
  panel2: "#EEF2F5",
  raised: "#E9EEF2",
  border: "#D7DEE5",
  borderSoft: "#E4E9EE",
  text: "#0B0F14",
  muted: "#52606B",
  faint: "#8A97A2",
  accent: "#0FB89E",
  accentInk: "#FFFFFF",
} as const;

/** Shared palette shape (dark and light share keys). */
export type Palette = { [K in keyof typeof dark]: string };

/** Severity styling, keyed by the analyst's flag severities. */
export const SEV: Record<RiskSeverity, { label: string; color: string; glow: string }> = {
  low: { label: "low", color: "#34E5D0", glow: "rgba(52,229,208,0.18)" },
  medium: { label: "medium", color: "#FFD23F", glow: "rgba(255,210,63,0.18)" },
  high: { label: "high", color: "#FF9F40", glow: "rgba(255,159,64,0.20)" },
  critical: { label: "critical", color: "#FF5160", glow: "rgba(255,81,96,0.24)" },
};

/** Per-event-type label, glyph, and rail dot colour for the timeline. */
export const TYPE_META: Record<EventType, { label: string; icon: string; dot: string }> = {
  prompt: { label: "Prompt", icon: "›", dot: "#8C9CFF" },
  response: { label: "Response", icon: "✦", dot: "#34E5D0" },
  tool_call: { label: "Tool call", icon: "⚙", dot: "#FF9F40" },
  code_change: { label: "Code change", icon: "±", dot: "#D08C5E" },
};

/** Category labels used by flag chips / breakdowns. */
export const CATEGORY_META: Record<RiskCategory, { label: string; color: string }> = {
  policy: { label: "Policy", color: "#FF9F40" },
  pii: { label: "PII", color: "#FF5160" },
  insecure: { label: "Insecure", color: "#FFD23F" },
  injection: { label: "Injection", color: "#8C9CFF" },
};

/** Map a 0–100 risk score to a palette colour. */
export function riskColor(score: number): string {
  if (score >= 75) return SEV.critical.color;
  if (score >= 50) return SEV.high.color;
  if (score >= 25) return SEV.medium.color;
  return dark.accent;
}

/** Map a 0–100 risk score to a human band. */
export function riskBand(score: number): string {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "calm";
}

/** Bucket a 0–100 score into a flag severity. */
export function severityForScore(score: number): RiskSeverity {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

/** Up-to-two-letter initials for an avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format an ISO timestamp as HH:MM:SS (24h). */
export function hhmmss(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

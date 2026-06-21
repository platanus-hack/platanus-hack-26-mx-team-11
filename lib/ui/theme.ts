import type { EventType, Severity } from "@/lib/types";

/**
 * Sentinel design system. Two palettes share one signal-teal accent:
 * - `dark`  → the console/dashboard, where admins live (calm, focused).
 * - `light` → marketing + auth, welcoming for non-technical users.
 * Components pick a palette; everything else (severity, helpers) is shared.
 */

export const dark = {
  bg: "#0A0E13",
  panel: "#10171F",
  panel2: "#0D131A",
  raised: "#152030",
  border: "#1E2A38",
  borderSoft: "#172230",
  text: "#E8EFF4",
  muted: "#8595A6",
  faint: "#55636F",
  accent: "#34E5D0",
  accentInk: "#06231F",
} as const;

export const light = {
  bg: "#FBFCFD",
  panel: "#FFFFFF",
  panel2: "#F4F7F9",
  raised: "#ECF2F5",
  border: "#E2E8EC",
  borderSoft: "#EDF1F4",
  text: "#0E1620",
  muted: "#5A6B78",
  faint: "#8DA0AD",
  accent: "#0FB3A2",
  accentInk: "#FFFFFF",
} as const;

export type Palette = { readonly [K in keyof typeof dark]: string };

export const SEV: Record<Severity, { color: string; glow: string; label: string }> = {
  critical: { color: "#FF5160", glow: "rgba(255,81,96,.22)", label: "Critical" },
  high: { color: "#FF9F40", glow: "rgba(255,159,64,.20)", label: "High" },
  medium: { color: "#FFD23F", glow: "rgba(255,210,63,.18)", label: "Medium" },
  low: { color: "#4FB7FF", glow: "rgba(79,183,255,.18)", label: "Low" },
};

export const TYPE_META: Record<EventType, { label: string; dot: string; icon: string }> = {
  prompt: { label: "Prompt", dot: "#7E8C9C", icon: "›_" },
  response: { label: "AI response", dot: "#8C9CFF", icon: "✦" },
  code_change: { label: "Code change", dot: "#9AE6B4", icon: "±" },
  tool_call: { label: "Tool call", dot: "#FFB454", icon: "⌘" },
};

export const riskColor = (s: number) =>
  s >= 75 ? SEV.critical.color : s >= 50 ? SEV.high.color : s >= 25 ? SEV.medium.color : SEV.low.color;

export const riskBand = (s: number) =>
  s >= 75 ? "Critical" : s >= 50 ? "Elevated" : s >= 25 ? "Watch" : "Nominal";

export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const hhmmss = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false });

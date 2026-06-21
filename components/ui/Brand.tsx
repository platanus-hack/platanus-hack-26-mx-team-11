import type { CSSProperties } from "react";
import { dark, light, type Palette } from "@/lib/ui/theme";

interface BrandProps {
  variant?: "dark" | "light";
  size?: number; // logo height in px
  showWordmark?: boolean;
  tagline?: boolean;
  pulse?: boolean; // animated radar sweep (used in the live console)
}

/** The Sentinel mark: a radar pulse with a single eye-dot at its center. */
export function SentinelMark({ size = 28, palette, pulse }: { size?: number; palette: Palette; pulse?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={pulse ? "sn-radar" : undefined} aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke={palette.muted} strokeWidth="1.4" opacity="0.45" />
      <circle cx="12" cy="12" r="6.4" stroke={palette.muted} strokeWidth="1.4" opacity="0.7" />
      <path d="M12 12 L20.2 6.3" stroke={palette.accent} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.6" fill={palette.accent} />
    </svg>
  );
}

export function Brand({ variant = "dark", size = 28, showWordmark = true, tagline = false, pulse = false }: BrandProps) {
  const palette = variant === "dark" ? dark : light;
  return (
    <div style={st.wrap}>
      <SentinelMark size={size} palette={palette} pulse={pulse} />
      {showWordmark && (
        <div>
          <div style={{ ...st.wordmark, color: palette.text, fontSize: size * 0.66 }}>Sentinel</div>
          {tagline && <div style={{ ...st.tagline, color: palette.muted }}>Watch every session</div>}
        </div>
      )}
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", gap: 11 },
  wordmark: { fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "var(--ui)" },
  tagline: { fontSize: 11, marginTop: 3, letterSpacing: "0.02em" },
};

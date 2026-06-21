import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui/Brand";
import { light as L } from "@/lib/ui/theme";

const GITHUB = "https://github.com/your-org/sentinel";

const STEPS = [
  { n: "01", t: "Onboard in one line", d: "Each teammate runs a single command. It wires Sentinel's hooks into Claude Code and applies their role's policies — no manual setup." },
  { n: "02", t: "Capture every event", d: "Prompts, tool calls, and code changes stream to your endpoint the moment they happen — across the whole org." },
  { n: "03", t: "Analyze with an AI judge", d: "A hardened Claude analyst rates each event 0–100 in context, flags PII, secrets, prod access, and injection — in plain English." },
  { n: "04", t: "See it, or stop it", d: "Watch sessions live in the console, or enforce policies that deny dangerous actions before they ever run." },
];

const FEATURES = [
  { t: "Real-time session replay", d: "Every session as a timeline: prompt → response → tool call, with risk scored inline." },
  { t: "Contextual risk, not keywords", d: "“Delete all tables on prod” stays critical even when the next message says it's a demo." },
  { t: "Injection-proof analyst", d: "The model reads events as untrusted data and can't be talked into lowering a score." },
  { t: "Policy enforcement", d: "Declarative deny/ask rules plus a live judge — block prod access, secrets, destructive ops." },
  { t: "Roles & policies", d: "Assign a role per teammate; policies apply automatically to their setup." },
  { t: "Self-host & open source", d: "One Next.js app on Vercel, Postgres on Supabase. Own your data end to end." },
];

export function Landing() {
  return (
    <div style={st.root}>
      <nav style={st.nav}>
        <Brand variant="light" size={26} />
        <div style={st.navRight}>
          <a href={GITHUB} style={st.navLink}>GitHub</a>
          <Link href="/login" style={st.navLink}>Sign in</Link>
          <Link href="/register" style={st.navCta}>Get started</Link>
        </div>
      </nav>

      <header style={st.hero}>
        <span style={st.pill}>Open-source AI coding security</span>
        <h1 style={st.h1}>
          Watch every AI coding session.<br />
          <span style={{ color: L.accent }}>Catch risk before it ships.</span>
        </h1>
        <p style={st.lede}>
          Sentinel gives security and engineering teams real-time visibility and control over the code
          your people build with Claude Code, Cursor, and Copilot — risk-scored, explained in plain
          English, and enforceable by policy.
        </p>
        <div style={st.heroCtas}>
          <Link href="/register" style={st.ctaPrimary}>Start free</Link>
          <a href={GITHUB} style={st.ctaGhost}>Star on GitHub →</a>
        </div>
        <Mockup />
      </header>

      <Section title="Shadow AI development is a blind spot" kicker="The problem">
        <p style={st.prose}>
          Non-technical employees now ship internal tools with powerful AI assistants — connecting to
          databases, handling customer data, running shell commands — with no oversight. Native vendor
          analytics cover one tool and speak to engineers. Sentinel unifies every tool and translates
          risk into something anyone can act on.
        </p>
      </Section>

      <Section title="How it works" kicker="Four steps">
        <div style={st.steps}>
          {STEPS.map((s) => (
            <div key={s.n} style={st.step}>
              <div style={st.stepN}>{s.n}</div>
              <div style={st.stepT}>{s.t}</div>
              <div style={st.stepD}>{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Everything you need to govern AI-assisted coding" kicker="Features">
        <div style={st.featGrid}>
          {FEATURES.map((f) => (
            <div key={f.t} style={st.feat}>
              <div style={st.featDot} />
              <div style={st.featT}>{f.t}</div>
              <div style={st.featD}>{f.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <section style={st.cta}>
        <h2 style={st.ctaH}>Stand up your console in minutes.</h2>
        <p style={st.ctaSub}>Deploy on Vercel, point your team's Claude Code at it, and start seeing risk today.</p>
        <div style={st.heroCtas}>
          <Link href="/register" style={st.ctaPrimary}>Create your organization</Link>
          <a href={GITHUB} style={st.ctaGhost}>Read the docs →</a>
        </div>
      </section>

      <footer style={st.footer}>
        <Brand variant="light" size={22} />
        <span style={st.footNote}>Open source · MIT · Self-hostable</span>
      </footer>
    </div>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section style={st.section}>
      <div style={st.kicker}>{kicker}</div>
      <h2 style={st.h2}>{title}</h2>
      {children}
    </section>
  );
}

/** A small static likeness of the console for the hero. */
function Mockup() {
  const rows = [
    { u: "Karen · Finance", t: "customer-export-tool", s: 72, c: "#FF9F40" },
    { u: "Marisol · Support", t: "quick-refund-bot", s: 95, c: "#FF5160" },
    { u: "Beto · Design", t: "dashboard-tweaks", s: 8, c: "#4FB7FF" },
  ];
  return (
    <div style={st.mock}>
      <div style={st.mockBar}>
        <span style={{ ...st.mockDot, background: "#FF5F57" }} />
        <span style={{ ...st.mockDot, background: "#FEBC2E" }} />
        <span style={{ ...st.mockDot, background: "#28C840" }} />
        <span style={st.mockUrl}>sentinel · live sessions</span>
      </div>
      <div style={st.mockBody}>
        {rows.map((r) => (
          <div key={r.t} style={st.mockRow}>
            <div>
              <div style={st.mockUser}>{r.u}</div>
              <div style={st.mockTitle}>{r.t}</div>
            </div>
            <div style={{ ...st.mockScore, color: r.c }}>{r.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const wrap = { maxWidth: 1080, margin: "0 auto", padding: "0 24px" } as const;

const st: Record<string, CSSProperties> = {
  root: { background: L.bg, color: L.text, fontFamily: "var(--ui)", minHeight: "100vh" },
  nav: { ...wrap, display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 },
  navRight: { display: "flex", alignItems: "center", gap: 22 },
  navLink: { color: L.muted, textDecoration: "none", fontSize: 14, fontWeight: 600 },
  navCta: { background: L.text, color: L.bg, textDecoration: "none", fontSize: 14, fontWeight: 700, padding: "8px 16px", borderRadius: 9 },

  hero: { ...wrap, textAlign: "center", paddingTop: 56, paddingBottom: 40 },
  pill: { display: "inline-block", fontSize: 12.5, fontWeight: 600, color: L.accent, background: "#E7F7F4", border: "1px solid #C7ECE6", borderRadius: 30, padding: "5px 13px" },
  h1: { fontSize: 52, lineHeight: 1.05, fontWeight: 700, letterSpacing: "-0.03em", margin: "22px 0 0" },
  lede: { fontSize: 17.5, color: L.muted, lineHeight: 1.6, maxWidth: 660, margin: "20px auto 0" },
  heroCtas: { display: "flex", gap: 14, justifyContent: "center", marginTop: 28, flexWrap: "wrap" },
  ctaPrimary: { background: L.accent, color: L.accentInk, textDecoration: "none", fontSize: 15, fontWeight: 700, padding: "12px 22px", borderRadius: 11 },
  ctaGhost: { color: L.text, textDecoration: "none", fontSize: 15, fontWeight: 600, padding: "12px 18px", borderRadius: 11, border: `1px solid ${L.border}` },

  mock: { maxWidth: 720, margin: "48px auto 0", background: L.panel, border: `1px solid ${L.border}`, borderRadius: 16, boxShadow: "0 24px 70px rgba(15,30,40,0.10)", overflow: "hidden", textAlign: "left" },
  mockBar: { display: "flex", alignItems: "center", gap: 7, padding: "11px 15px", borderBottom: `1px solid ${L.borderSoft}`, background: L.panel2 },
  mockDot: { width: 11, height: 11, borderRadius: "50%" },
  mockUrl: { marginLeft: 10, fontSize: 12, color: L.faint, fontFamily: "var(--mono)" },
  mockBody: { padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  mockRow: { display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${L.borderSoft}`, borderRadius: 10, padding: "12px 14px" },
  mockUser: { fontSize: 13.5, fontWeight: 600 },
  mockTitle: { fontSize: 12, color: L.muted, fontFamily: "var(--mono)", marginTop: 3 },
  mockScore: { fontSize: 22, fontWeight: 800, fontFamily: "var(--mono)" },

  section: { ...wrap, paddingTop: 64, paddingBottom: 8 },
  kicker: { fontSize: 12.5, fontWeight: 700, color: L.accent, textTransform: "uppercase", letterSpacing: "0.08em" },
  h2: { fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: "10px 0 22px", maxWidth: 720 },
  prose: { fontSize: 16.5, color: L.muted, lineHeight: 1.65, maxWidth: 720 },

  steps: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 },
  step: { background: L.panel, border: `1px solid ${L.border}`, borderRadius: 14, padding: "20px 20px 22px" },
  stepN: { fontSize: 13, fontWeight: 800, fontFamily: "var(--mono)", color: L.accent },
  stepT: { fontSize: 16.5, fontWeight: 700, marginTop: 12 },
  stepD: { fontSize: 14, color: L.muted, lineHeight: 1.6, marginTop: 8 },

  featGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  feat: { padding: "18px 4px" },
  featDot: { width: 10, height: 10, borderRadius: 3, background: L.accent },
  featT: { fontSize: 16, fontWeight: 700, marginTop: 12 },
  featD: { fontSize: 14, color: L.muted, lineHeight: 1.6, marginTop: 7 },

  cta: { ...wrap, textAlign: "center", marginTop: 72, padding: "56px 24px", background: "linear-gradient(180deg, #F1FAF8, #FFFFFF)", border: `1px solid ${L.border}`, borderRadius: 22, maxWidth: 1032 },
  ctaH: { fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  ctaSub: { fontSize: 16, color: L.muted, marginTop: 12 },

  footer: { ...wrap, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 64, padding: "28px 24px 48px", borderTop: `1px solid ${L.borderSoft}` },
  footNote: { fontSize: 13, color: L.faint },
};

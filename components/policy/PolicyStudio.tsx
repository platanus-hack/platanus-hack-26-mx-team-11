"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Brand } from "@/components/ui/Brand";
import { C, SEV } from "@/components/dashboard/theme";
import { POLICIES } from "@/lib/policy/catalog";
import { ROLES } from "@/lib/policy/roles";
import { buildSettings } from "@/lib/policy/generate";

const ENV_VAR = "CODESENTINEL_KEY";
const MODES = ["default", "acceptEdits", "plan"] as const;

export function PolicyStudio() {
  const [roleId, setRoleId] = useState(ROLES[0].id);
  const [selected, setSelected] = useState<Set<string>>(new Set(ROLES[0].policyIds));
  const [endpoint, setEndpoint] = useState("http://localhost:3000");
  const [keyValue, setKeyValue] = useState("cs_dev_local");
  const [mode, setMode] = useState<(typeof MODES)[number]>("default");
  const [copied, setCopied] = useState<"json" | "shell" | null>(null);

  // Prefill the endpoint with wherever the console is being served from.
  useEffect(() => setEndpoint(window.location.origin), []);

  function pickRole(id: string) {
    const role = ROLES.find((r) => r.id === id);
    if (!role) return;
    setRoleId(id);
    setSelected(new Set(role.policyIds));
  }

  function togglePolicy(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setRoleId("custom"); // diverged from any preset
  }

  const chosen = useMemo(() => POLICIES.filter((p) => selected.has(p.id)), [selected]);
  const settings = useMemo(
    () => buildSettings({ endpoint, auth: { kind: "env", envVar: ENV_VAR }, policies: chosen, defaultMode: mode }),
    [endpoint, chosen, mode]
  );
  const settingsJson = useMemo(() => JSON.stringify(settings, null, 2), [settings]);
  const shellLine = `export ${ENV_VAR}="${keyValue}"`;

  async function copy(text: string, which: "json" | "shell") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
  }

  return (
    <div style={st.root}>
      <header style={st.header}>
        <div style={st.brandWrap}>
          <Brand variant="dark" size={28} />
          <div>
            <div style={st.brand}>Policy Studio</div>
            <div style={st.sub}>Pick a role, tune its policies, copy the generated setup.</div>
          </div>
        </div>
        <Link href="/" style={st.navLink}>← Console</Link>
      </header>

      <div style={st.body}>
        {/* Left: roles + policies */}
        <section style={st.left}>
          <div style={st.colHead}>1 · Role</div>
          <div style={st.roleGrid}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => pickRole(r.id)}
                style={{ ...st.roleCard, borderColor: roleId === r.id ? C.accent : C.borderSoft, background: roleId === r.id ? C.raised : "transparent" }}
              >
                <div style={st.roleLabel}>{r.label}</div>
                <div style={st.roleDesc}>{r.description}</div>
              </button>
            ))}
          </div>

          <div style={{ ...st.colHead, marginTop: 18 }}>
            2 · Policies <span style={st.hint}>{chosen.length} on</span>
          </div>
          <div style={st.policyList}>
            {POLICIES.map((p) => {
              const on = selected.has(p.id);
              const accent = SEV[p.category === "policy" ? "high" : p.category === "insecure" ? "medium" : "low"].color;
              const count = (p.rules.deny?.length ?? 0) + (p.rules.ask?.length ?? 0);
              return (
                <button key={p.id} onClick={() => togglePolicy(p.id)} style={{ ...st.policyRow, borderColor: on ? accent : C.borderSoft }}>
                  <span style={{ ...st.check, borderColor: on ? accent : C.faint, background: on ? accent : "transparent" }}>
                    {on ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={st.policyLabel}>{p.label}</span>
                    <span style={st.policyDesc}>{p.description}</span>
                  </span>
                  <span style={st.policyTag}>{p.rules.deny ? "deny" : "ask"} · {count}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right: config + output */}
        <section style={st.right}>
          <div style={st.colHead}>3 · Setup</div>
          <label style={st.field}>
            <span style={st.fieldLabel}>Endpoint</span>
            <input style={st.input} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} spellCheck={false} />
          </label>
          <div style={st.fieldRow}>
            <label style={{ ...st.field, flex: 1 }}>
              <span style={st.fieldLabel}>API key</span>
              <input style={st.input} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} spellCheck={false} />
            </label>
            <label style={{ ...st.field, width: 140 }}>
              <span style={st.fieldLabel}>Default mode</span>
              <select style={st.input} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          <div style={st.outHead}>
            <span style={st.colHead}>~/.claude/settings.json</span>
            <button style={st.copyBtn} onClick={() => copy(settingsJson, "json")}>
              {copied === "json" ? "✓ Copied" : "Copy JSON"}
            </button>
          </div>
          <pre style={st.code}>{settingsJson}</pre>

          <div style={st.outHead}>
            <span style={st.colHead}>Shell (set the key once)</span>
            <button style={st.copyBtn} onClick={() => copy(shellLine, "shell")}>
              {copied === "shell" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre style={st.codeSmall}>{shellLine}</pre>
          <div style={st.note}>
            Paste the JSON into <code style={st.kbd}>~/.claude/settings.json</code>, run the shell line, and start
            Claude Code. To enforce org-wide so users can't remove it, ship the same JSON via managed settings.
          </div>
        </section>
      </div>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  root: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "var(--ui)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: `linear-gradient(180deg, ${C.panel}, ${C.panel2})`, gap: 14, flexWrap: "wrap" },
  brandWrap: { display: "flex", alignItems: "center", gap: 14 },
  brand: { fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" },
  sub: { fontSize: 12, color: C.muted, marginTop: 3 },
  navLink: { color: C.accent, textDecoration: "none", fontSize: 13, fontWeight: 600 },
  body: { display: "flex", gap: 1, background: C.border, alignItems: "stretch", flexWrap: "wrap" },
  left: { background: C.bg, padding: "16px 18px", flex: "1 1 420px", minWidth: 320 },
  right: { background: C.panel2, padding: "16px 18px", flex: "1 1 460px", minWidth: 320 },
  colHead: { fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" },
  hint: { color: C.faint, fontWeight: 500, textTransform: "none", letterSpacing: 0, marginLeft: 6 },
  roleGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 11 },
  roleCard: { textAlign: "left", border: "1px solid", borderRadius: 10, padding: "10px 12px", cursor: "pointer", color: C.text, fontFamily: "var(--ui)", transition: "border-color .15s, background .15s" },
  roleLabel: { fontSize: 13.5, fontWeight: 700 },
  roleDesc: { fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.45 },
  policyList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 11 },
  policyRow: { display: "flex", alignItems: "center", gap: 11, textAlign: "left", border: "1px solid", borderRadius: 10, padding: "10px 12px", cursor: "pointer", color: C.text, background: "transparent", fontFamily: "var(--ui)", transition: "border-color .15s" },
  check: { width: 20, height: 20, borderRadius: 6, border: "1.5px solid", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#06231F", flexShrink: 0 },
  policyLabel: { display: "block", fontSize: 13.5, fontWeight: 600 },
  policyDesc: { display: "block", fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.45 },
  policyTag: { fontSize: 10, color: C.faint, fontFamily: "var(--mono)", textTransform: "uppercase", flexShrink: 0 },
  field: { display: "block", marginTop: 11 },
  fieldRow: { display: "flex", gap: 10 },
  fieldLabel: { display: "block", fontSize: 11, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", fontSize: 12.5, fontFamily: "var(--mono)", outline: "none" },
  outHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 8 },
  copyBtn: { background: C.accent, color: "#06231F", border: "none", padding: "6px 13px", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "var(--ui)" },
  code: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 11.5, fontFamily: "var(--mono)", color: "#C7D2DD", overflowX: "auto", lineHeight: 1.5, margin: 0, maxHeight: 360 },
  codeSmall: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, fontFamily: "var(--mono)", color: "#C7D2DD", overflowX: "auto", margin: 0 },
  note: { fontSize: 12, color: C.muted, marginTop: 12, lineHeight: 1.55 },
  kbd: { fontFamily: "var(--mono)", color: C.text, background: C.raised, padding: "1px 5px", borderRadius: 4 },
};

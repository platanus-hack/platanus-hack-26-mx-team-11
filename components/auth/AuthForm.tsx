"use client";

import Link from "next/link";
import { useActionState, type CSSProperties } from "react";
import { Brand } from "@/components/ui/Brand";
import { light as L } from "@/lib/ui/theme";
import { login, register, type AuthState } from "@/app/(auth)/actions";

const FIELD = { fontFamily: "var(--ui)" };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? login : register;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  const isRegister = mode === "register";
  return (
    <div style={st.card}>
      <div style={st.head}>
        <Brand variant="light" size={30} />
      </div>
      <h1 style={st.title}>{isRegister ? "Create your organization" : "Welcome back"}</h1>
      <p style={st.sub}>
        {isRegister ? "Start watching your team's AI coding sessions." : "Sign in to your Sentinel console."}
      </p>

      <form action={formAction} style={st.form}>
        {isRegister && (
          <>
            <Field label="Your name" name="full_name" type="text" placeholder="Ada Lovelace" required />
            <Field label="Organization" name="org_name" type="text" placeholder="Acme Inc." required />
          </>
        )}
        <Field label="Work email" name="email" type="email" placeholder="you@company.com" required />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required minLength={8} />

        {state.error && <div style={st.error}>{state.error}</div>}
        {state.notice && <div style={st.notice}>{state.notice}</div>}

        <button type="submit" disabled={pending} style={{ ...st.submit, opacity: pending ? 0.6 : 1 }}>
          {pending ? "…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      <div style={st.alt}>
        {isRegister ? (
          <>Already have an account? <Link href="/login" style={st.link}>Sign in</Link></>
        ) : (
          <>New here? <Link href="/register" style={st.link}>Create an organization</Link></>
        )}
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={st.field}>
      <span style={st.label}>{label}</span>
      <input {...props} style={{ ...st.input, ...FIELD }} />
    </label>
  );
}

const st: Record<string, CSSProperties> = {
  card: { width: "100%", maxWidth: 400, background: L.panel, border: `1px solid ${L.border}`, borderRadius: 16, padding: "30px 30px 26px", boxShadow: "0 10px 40px rgba(15,30,40,0.06)" },
  head: { marginBottom: 22 },
  title: { fontSize: 22, fontWeight: 700, color: L.text, letterSpacing: "-0.02em", margin: 0 },
  sub: { fontSize: 13.5, color: L.muted, marginTop: 7, marginBottom: 22, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 13 },
  field: { display: "block" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: L.text, marginBottom: 6 },
  input: { width: "100%", background: L.bg, color: L.text, border: `1px solid ${L.border}`, borderRadius: 9, padding: "10px 12px", fontSize: 13.5, outline: "none" },
  error: { fontSize: 12.5, color: "#C0392B", background: "#FDECEA", border: "1px solid #F5C6CB", borderRadius: 8, padding: "8px 11px" },
  notice: { fontSize: 12.5, color: "#0B6E63", background: "#E6F7F4", border: "1px solid #BCEBE3", borderRadius: 8, padding: "8px 11px" },
  submit: { marginTop: 4, background: L.accent, color: L.accentInk, border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--ui)" },
  alt: { marginTop: 18, fontSize: 13, color: L.muted, textAlign: "center" },
  link: { color: L.accent, fontWeight: 600, textDecoration: "none" },
};

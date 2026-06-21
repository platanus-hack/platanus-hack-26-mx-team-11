import type { CSSProperties } from "react";
import Link from "next/link";
import { light as L } from "@/lib/ui/theme";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={st.root}>
      <main style={st.main}>{children}</main>
      <footer style={st.footer}>
        <Link href="/" style={st.back}>← Back to sentinel.dev</Link>
      </footer>
    </div>
  );
}

const st: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", background: `radial-gradient(1100px 540px at 50% -10%, #EAF6F4, ${L.bg})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "var(--ui)" },
  main: { width: "100%", display: "flex", justifyContent: "center" },
  footer: { marginTop: 22 },
  back: { fontSize: 12.5, color: L.muted, textDecoration: "none" },
};

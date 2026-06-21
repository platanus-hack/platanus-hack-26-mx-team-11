import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — AI coding security console",
  description: "Watch every AI-assisted coding session. Real-time risk analysis, policy enforcement, and observability for citizen developers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

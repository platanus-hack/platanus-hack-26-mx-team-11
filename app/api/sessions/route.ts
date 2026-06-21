import { NextResponse } from "next/server";
import { listSessionsForViewer } from "@/lib/repo/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live feed the console polls — scoped to the signed-in admin's org (or demo). */
export async function GET() {
  return NextResponse.json({ sessions: await listSessionsForViewer() });
}

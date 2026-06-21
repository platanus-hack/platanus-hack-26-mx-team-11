import { lookupMemberByToken } from "@/lib/auth/tokens";
import { buildSettings } from "@/lib/policy/generate";
import { POLICIES } from "@/lib/policy/catalog";
import { resolvePolicies } from "@/lib/policy/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-member one-line installer:  curl -fsSL <app>/api/install/<token> | sh
 * Returns a POSIX shell script that merges Sentinel's hooks + the member's role
 * policies into ~/.claude/settings.json. Token is embedded so there's no env step.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const member = await lookupMemberByToken(token);
  if (!member) {
    return new Response("# Sentinel: invalid or revoked token\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const origin = new URL(req.url).origin;
  const settings = buildSettings({
    endpoint: origin,
    policies: resolvePolicies(POLICIES, member.policyIds),
    auth: { kind: "token", token },
  });

  const payload = Buffer.from(JSON.stringify(settings), "utf8").toString("base64");

  return new Response(installScript(payload, member.memberName), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

/** A small, auditable installer. Merges (never blindly overwrites) settings.json. */
function installScript(payloadB64: string, name: string): string {
  const merge = [
    'const fs=require("fs"),f=process.argv[1];',
    'const inc=JSON.parse(Buffer.from(process.argv[2],"base64").toString("utf8"));',
    'let cur={};try{cur=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}',
    "cur.hooks={...(cur.hooks||{}),...inc.hooks};",
    "const p=inc.permissions||{},cp=cur.permissions||{},u=a=>[...new Set(a)];",
    "cur.permissions={...cp,...p};",
    "const deny=u([...(cp.deny||[]),...(p.deny||[])]);if(deny.length)cur.permissions.deny=deny;",
    "const ask=u([...(cp.ask||[]),...(p.ask||[])]);if(ask.length)cur.permissions.ask=ask;",
    'fs.writeFileSync(f,JSON.stringify(cur,null,2));',
  ].join("");

  return `#!/bin/sh
# Sentinel installer for ${name}. Inspect freely — it only edits ~/.claude/settings.json.
set -e
DIR="$HOME/.claude"; F="$DIR/settings.json"
mkdir -p "$DIR"
[ -f "$F" ] && cp "$F" "$F.sentinel-bak" && echo "Backed up existing settings to $F.sentinel-bak"
command -v node >/dev/null 2>&1 || { echo "Sentinel needs Node.js (it ships with Claude Code)."; exit 1; }
node -e '${merge}' "$F" "${payloadB64}"
echo "✓ Sentinel is watching this machine. Open Claude Code and start a session."
`;
}

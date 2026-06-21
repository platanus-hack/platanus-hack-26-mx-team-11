import type { User } from "@/lib/types";

type KeyOwner = Omit<User, "role">;

const DEV_KEY = "cs_dev_local";
const DEV_OWNER: KeyOwner = {
  id: "u_demo",
  name: "Demo User",
  email: "demo@local",
  team: "Ops",
  orgId: "org_demo",
};

function loadKeyMap(): Record<string, KeyOwner> {
  const raw = process.env.CODESENTINEL_KEYS;
  if (!raw) return { [DEV_KEY]: DEV_OWNER };
  try {
    return JSON.parse(raw) as Record<string, KeyOwner>;
  } catch {
    console.warn("[auth] CODESENTINEL_KEYS is not valid JSON — falling back to dev key");
    return { [DEV_KEY]: DEV_OWNER };
  }
}

/** Resolve the bearer token a user put in $CODESENTINEL_KEY to their identity. */
export function lookupUserByApiKey(key: string | null): User | null {
  if (!key) return null;
  const owner = loadKeyMap()[key.trim()];
  return owner ? { ...owner, role: "employee" } : null;
}

export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : header.trim();
}

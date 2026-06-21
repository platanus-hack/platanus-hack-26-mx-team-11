import { isServiceConfigured } from "@/lib/db/env";
import { lookupMemberByToken } from "@/lib/auth/tokens";
import { bearerFrom, lookupUserByApiKey } from "@/lib/auth/apiKeys";

/** Who an ingested event belongs to. */
export interface Identity {
  id: string; // member id (or demo user id)
  orgId: string;
  name: string;
  team: string;
}

/**
 * Resolve the bearer header on an ingest request to an identity.
 * Production: hashed per-member token via Supabase. Demo: the env dev key.
 */
export async function resolveIdentity(authHeader: string | null): Promise<Identity | null> {
  const token = bearerFrom(authHeader);
  if (!token) return null;

  if (isServiceConfigured) {
    const ctx = await lookupMemberByToken(token);
    return ctx ? { id: ctx.memberId, orgId: ctx.orgId, name: ctx.memberName, team: ctx.team } : null;
  }

  const user = lookupUserByApiKey(token);
  return user ? { id: user.id, orgId: user.orgId, name: user.name, team: user.team } : null;
}

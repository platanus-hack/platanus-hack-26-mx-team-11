/** Database row shapes (snake_case as stored in Postgres). */

export interface OrgRow {
  id: string;
  name: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface MemberRow {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  team: string;
  role_id: string;
  policy_ids: string[];
  created_at: string;
}

export interface MemberTokenRow {
  id: string;
  member_id: string;
  org_id: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  org_id: string;
  member_id: string | null;
  member_name: string;
  team: string;
  title: string;
  tool: string;
  status: string;
  risk_score: number;
  started_at: string;
  ended_at: string | null;
}

export interface EventRow {
  id: string;
  session_id: string;
  org_id: string;
  type: string;
  who: string;
  content: string;
  risk_score: number;
  summary: string;
  created_at: string;
}

export interface RiskFlagRow {
  id: string;
  event_id: string;
  org_id: string;
  category: string;
  severity: string;
  title: string;
  explanation: string;
  suggested_fix: string;
  confidence: number;
  created_at: string;
}

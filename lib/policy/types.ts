import type { RiskCategory } from "@/lib/types";

/** A reusable bundle of Claude Code permission rules with a human label. */
export interface Policy {
  id: string;
  label: string;
  description: string;
  category: RiskCategory;
  rules: { deny?: string[]; ask?: string[] };
}

/** A named preset: a role/team and the policies it ships with by default. */
export interface Role {
  id: string;
  label: string;
  team: string;
  description: string;
  policyIds: string[];
}

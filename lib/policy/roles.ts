import type { Role } from "@/lib/policy/types";

/** Role presets. Selecting one preselects its policies; everything stays editable. */
export const ROLES: Role[] = [
  {
    id: "finance",
    label: "Finance",
    team: "Finance",
    description: "Handles sensitive customer & financial data. Locked down by default.",
    policyIds: ["protect-production", "protect-secrets", "no-external-network", "no-destructive"],
  },
  {
    id: "support",
    label: "Support",
    team: "Support",
    description: "Builds quick internal tools. Guard prod and destructive actions.",
    policyIds: ["protect-production", "no-destructive", "approve-deploys"],
  },
  {
    id: "marketing",
    label: "Marketing",
    team: "Marketing",
    description: "Automations and integrations. Keep secrets and traffic in check.",
    policyIds: ["protect-secrets", "no-external-network", "approve-installs"],
  },
  {
    id: "engineering",
    label: "Engineering",
    team: "Engineering",
    description: "Trusted builders. Light guardrails, confirm risky steps.",
    policyIds: ["approve-deploys", "approve-installs"],
  },
  {
    id: "locked-down",
    label: "Locked down",
    team: "Restricted",
    description: "Maximum restriction — every policy on.",
    policyIds: ["protect-production", "no-destructive", "protect-secrets", "no-external-network", "approve-deploys", "approve-installs"],
  },
];

export const roleById = (id: string): Role | undefined => ROLES.find((r) => r.id === id);

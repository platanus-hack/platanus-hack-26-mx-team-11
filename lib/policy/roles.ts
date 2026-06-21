/**
 * Role presets — sensible starting bundles of Library policies for common
 * personas. In the governance model these map to **groups**: a group is a named
 * set of members that inherits org policies plus its own. Roles remain the quick
 * preset used by the Team page and Policy Studio.
 */
import { POLICIES } from "@/lib/policy/catalog";

export interface Role {
  id: string;
  label: string;
  description: string;
  policyIds: string[];
}

/** Every shipped policy id — used by the "locked down" preset. */
const ALL = POLICIES.map((p) => p.id);

export const ROLES: Role[] = [
  {
    id: "marketing",
    label: "Marketing Vibe Coders",
    description: "Build dashboards & sites with anonymized data and approved tools.",
    policyIds: [
      "prevent-pii-export",
      "no-production-access",
      "approved-apis-only",
      "public-publish-approval",
      "prompt-injection-protection",
    ],
  },
  {
    id: "finance",
    label: "Finance Analysts",
    description: "Tight data controls — no PII export, no production, no destructive ops.",
    policyIds: [
      "prevent-pii-export",
      "no-production-access",
      "prevent-secrets",
      "no-destructive-commands",
      "prompt-injection-protection",
    ],
  },
  {
    id: "support",
    label: "Support",
    description: "Internal tooling with secret + injection protection.",
    policyIds: ["prevent-secrets", "prevent-pii-export", "prompt-injection-protection"],
  },
  {
    id: "engineering",
    label: "Engineering",
    description: "Lighter touch — secrets, destructive ops, and deploy approvals.",
    policyIds: [
      "prevent-secrets",
      "no-destructive-commands",
      "public-publish-approval",
      "approve-installs",
      "prompt-injection-protection",
    ],
  },
  {
    id: "external-contractors",
    label: "External Contractors",
    description: "Locked down — every policy on.",
    policyIds: ALL,
  },
];

/** The role new members default to. */
export const ROLE_DEFAULT = "engineering";

const BY_ID = new Map(ROLES.map((r) => [r.id, r]));

export function roleById(id: string): Role | undefined {
  return BY_ID.get(id);
}

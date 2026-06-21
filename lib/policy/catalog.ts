import type { Policy } from "@/lib/policy/types";

/**
 * The policy catalog. Each entry maps to native Claude Code permission rules
 * (`deny` = refused outright, `ask` = forces a confirmation). Command-string
 * rules are defense-in-depth — pair with the sandbox and the LLM analyst hook
 * for anything that must never run.
 */
export const POLICIES: Policy[] = [
  {
    id: "protect-production",
    label: "Protect production",
    description: "Block direct connections to production databases and prod CLIs.",
    category: "policy",
    rules: { deny: ["Bash(psql *)", "Bash(mysql *)", "Bash(mongosh *)", "Bash(pg_dump *)", "Bash(prod *)"] },
  },
  {
    id: "no-destructive",
    label: "No destructive commands",
    description: "Block irreversible deletes, drops, and force-resets.",
    category: "policy",
    rules: { deny: ["Bash(rm -rf *)", "Bash(rmdir *)", "Bash(dropdb *)", "Bash(git push --force *)", "Bash(git reset --hard *)"] },
  },
  {
    id: "protect-secrets",
    label: "Protect secrets",
    description: "Block reads of credential files (.env, AWS, SSH keys).",
    category: "insecure",
    rules: { deny: ["Read(./.env)", "Read(./.env.*)", "Read(**/.env)", "Read(./secrets/**)", "Read(~/.aws/**)", "Read(~/.ssh/**)"] },
  },
  {
    id: "no-external-network",
    label: "No external network",
    description: "Block outbound web fetches and searches from the assistant.",
    category: "policy",
    rules: { deny: ["WebFetch", "WebSearch"] },
  },
  {
    id: "approve-deploys",
    label: "Approve deploys & pushes",
    description: "Require confirmation before pushing code or shipping.",
    category: "policy",
    rules: { ask: ["Bash(git push *)", "Bash(vercel *)", "Bash(npm publish *)", "Bash(docker push *)"] },
  },
  {
    id: "approve-installs",
    label: "Approve package installs",
    description: "Require confirmation before adding new dependencies.",
    category: "insecure",
    rules: { ask: ["Bash(npm install *)", "Bash(pnpm add *)", "Bash(pip install *)", "Bash(brew install *)"] },
  },
];

export const policyById = (id: string): Policy | undefined => POLICIES.find((p) => p.id === id);

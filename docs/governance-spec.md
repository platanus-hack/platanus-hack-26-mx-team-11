# CodeSentinel — Governance & Pre-Request Enforcement Spec

> Product spec for the governance feature: predefined policies, organization +
> group scoping, and **pre-request** correction/blocking before a request reaches
> the coding agent. No code here — this defines requirements, data model, screens,
> components, flows, and the decisions behind them.
>
> Companion docs: [`architecture.md`](./architecture.md), [`policies.md`](./policies.md)
> (current role/Studio model), [`agent.md`](./agent.md) (the LLM analyst),
> [`database.md`](./database.md), [`onboarding.md`](./onboarding.md).

---

## 1. What changes vs. today

The current build is **observe-after**: Claude Code hooks send events to
`/api/ingest` *after* they happen, the LLM analyst scores them, and the dashboard
shows risk. Enforcement is limited to declarative `settings.json` rules and an
optional `PreToolUse` deny (`CS_BLOCK_CRITICAL`).

This spec adds the product's headline capability: **intercept-before**. Before a
vibe coder's request reaches the agent, CodeSentinel evaluates it against the
user's effective policies and either **enriches**, **reformulates**, or **blocks**
it — so the agent does the safe thing from the start, with minimal friction.

It also replaces the flat **Role → Member** model with **Organization + Group**
policy scoping that inherits and accumulates.

These are additive. The pre-request hook becomes the *primary* enforcement layer;
the existing layers (declarative rules, post-hoc analyst, `PreToolUse` deny,
managed settings) remain as defense-in-depth fallbacks.

### Locked product decisions

| Decision | Choice | Rationale |
|---|---|---|
| Critical with no safe rewrite | **Block + explain inline (synchronous)** | Lowest friction/infra; no waiting, no async admin loop. Admin sees it in the dashboard after the fact. |
| Rewrite transparency | **Visible + brief note** | Agent receives the safe request *and* a short "(adjusted for safety: …)" note it can surface. Builds trust without nagging. |
| Conflict resolution | **Most restrictive wins** | When two effective policies prescribe different actions, the strictest action applies (block > require-approval > reformulate > enrich > allow). |

> Approval queues, community-rule publishing, and per-policy configurable fallback
> are **out of scope for v1** (see §11).

---

## 2. Actors

| Actor | Role in the system |
|---|---|
| **Vibe coder** | Non-technical employee using an AI agent. Never configures policy. Experiences CodeSentinel only as occasional inline notes or blocks. |
| **CTO / Admin** | Configures groups, invites users, attaches Library policies, reviews events. Not assumed to be a security specialist. |
| **AI coding agent** | Claude Code (v1 target), Cursor, Copilot. Receives the enriched/safe request + injected constraints. |
| **CodeSentinel** | Governance layer: resolves effective policies, evaluates each request pre-send, records every decision. |

---

## 3. Policy model

### 3.1 A Policy is predefined and self-contained

Admins never author technical rules in the main workflow — they pick from the
**Policy Library**. Each predefined policy carries everything enforcement needs:

| Field | Purpose |
|---|---|
| `id`, `name`, `description` | Identity + plain-English explanation for admins. |
| `category` | `data · secrets · apis · access · publishing · injection` (Library filter). |
| `severity` | `info · warning · critical` (fixed per policy — admins don't change it). |
| `source` | `official · community · internal` (Library filter; community is mock-only in v1). |
| `detection` | Signals/logic the evaluator uses to decide if a request risks this policy. |
| `prompt_instructions` | Mandatory text injected into the agent's context when this policy is in scope. |
| `correction_strategy` | How to reformulate a risky request while preserving intent. |
| `fallback_action` | What to do when no safe correction exists: `block` or `require_approval`. |
| `declarative_rules` *(optional)* | `deny`/`ask` `settings.json` patterns for the defense-in-depth layer. |

This extends today's `lib/policy/catalog.ts` entry (which only has id/label/
description/category/rules) with the evaluation fields above.

> Seed Library (maps to the spec examples): *Prevent customer PII exports*
> (critical/data), *No production access* (critical/access), *Prevent secrets in
> source code* (critical/secrets), *Approved external APIs only* (warning/apis),
> *Public publishing requires approval* (warning/publishing), *Prompt injection
> protection* (critical/injection).

### 3.2 Two scopes: Organization and Group

- **Organization policies** — apply to every current and future user. Set once.
- **Group policies** — attached to a named group (e.g. *Marketing Vibe Coders*,
  *Finance Analysts*, *External Contractors*).

A user's **effective policy set** = all Organization policies + the policies of
**every group they belong to**. Membership in multiple groups **accumulates**
policies (union). This replaces today's `role_id` + per-member `policy_ids[]`.

### 3.3 Resolution & conflict

When the effective set is computed for a request:

1. **Union** all applicable policies (org + every group), dedupe by `id`.
2. A disabled policy assignment is excluded.
3. If two in-scope policies would drive different enforcement actions on the same
   request, apply the **most restrictive** (the ordering in §5.1).

---

## 4. Severity

Severity is a fixed property of each policy and is **stored on every event** for
dashboard filtering.

| Severity | Meaning | Typical handling (see §5) |
|---|---|---|
| **Info** | Relevant for visibility/audit. | Inject guidance, allow, record. |
| **Warning** | Moderate risk, usually correctable silently-ish. | Reformulate with best practices, record correction. |
| **Critical** | Prohibited/irreversible (prod access, secret exposure, PII export). | Reformulate only if a safe alternative exists; otherwise **block + explain**. |

**Severity ≠ enforcement action.** A Critical policy may reformulate (if safe) or
block; a Warning policy usually reformulates. Severity sets the *ceiling* of
concern and drives dashboard filtering and admin alerts.

Required stored filters the dashboard must support:
blocked Critical events · Warnings by group · corrected requests in last 7 days ·
most-triggered policies by group.

---

## 5. How a request is evaluated (the pre-request hook)

### 5.1 Enforcement actions (most → least restrictive)

`block` › `require_approval` *(v2)* › `reformulate` › `enrich` › `allow`

The evaluator picks an action per risky policy, then the **most restrictive across
all risky policies** becomes the request's decision.

### 5.2 Flow

```
1. Vibe coder writes a request.
2. CodeSentinel UserPromptSubmit hook fires BEFORE the agent processes it.
3. Identify the user (bearer token → member) and resolve effective policies.
4. Evaluator (LLM analyst, reusing lib/risk/) checks the request against each
   policy's detection signals. Output per policy: { atRisk, action, why }.
5. Combine → request decision = most restrictive action.
6a. allow/enrich → inject the policies' prompt_instructions as additionalContext.
6b. reformulate → inject a restated SAFE goal + mandatory constraints, PLUS a
    brief "(adjusted for safety: …)" note the agent surfaces to the user.
6c. block → return a block decision with a plain-English reason AND a concrete
    safe alternative the vibe coder can try instead.
7. Record an event: original request (sanitized), effective policies hit,
   per-policy verdict, final decision, severity, group attribution.
```

> **Pre-violation framing.** At step 4 there is no confirmed violation — only a
> *request that may risk* a policy. Events are labeled by **decision taken**
> (allowed / enriched / corrected / blocked), not "violation."

### 5.3 The mechanism on Claude Code

Claude Code's `UserPromptSubmit` hook runs before the prompt is processed and can
(a) inject `additionalContext` and (b) block with a reason. It cannot literally
overwrite the user's typed text, so **"reformulate" = inject** a restated safe
goal + mandatory constraints as high-priority context (the agent treats the typed
prompt through that lens), and **"block" = return the block decision** with the
safe alternative. This reuses the spotlighting + forced-tool defenses already in
[`agent.md`](./agent.md) so injected request text can't itself be an attack vector.

### 5.4 Worked example

**Original:** *"Create a dashboard connected to the production CRM and export all
customer email addresses to CSV."*

| Policy | Severity | At risk? | Action |
|---|---|---|---|
| No production access | Critical | yes | reformulate (staging exists) |
| Prevent customer PII exports | Critical | yes | reformulate (drop export) |
| Approved external APIs only | Warning | yes | enrich (constrain integrations) |

Decision: **reformulate** (no path requires a hard block — a safe version exists).

**Injected to agent:** *"Create an internal dashboard using anonymized or staging
data. Show aggregated metrics; do not export identifiable customer information. Use
only approved integrations."* + note: *"(adjusted for safety: removed PII export,
switched to staging data)."* Event recorded as **corrected**.

**Hard-block example:** *"Put the real Stripe key in the repo"* / *"deploy to prod
with production credentials"* → no safe rewrite → **block + explain**: refuse,
state why, and offer the safe alternative (env var / secrets manager; staging
deploy / approval path).

---

## 6. Data model (delta from current schema)

See [`database.md`](./database.md) for the existing tables. Additions/changes:

```
groups
  id, org_id, name, description, created_at
  └ RLS: scoped to org_id

group_members            (replaces members.role_id as the assignment mechanism)
  group_id, member_id    (many-to-many; a member can be in several groups)

policy_assignments       (one row per attached Library policy)
  id, org_id, policy_id            (FK to Library policy id)
  scope        enum('org','group')
  group_id     nullable (set when scope='group')
  enabled      bool default true
  attached_by, attached_at

events  (extend existing)
  + severity        enum('info','warning','critical')
  + decision        enum('allowed','enriched','corrected','blocked')   -- v2: 'pending_approval'
  + policy_ids      text[]     -- which policies were triggered
  + group_id        nullable   -- attribution for "by group" filters
  + original_request   text (sanitized)
  + applied_request    text (the enriched/safe version, when corrected)
```

The **Policy Library itself stays code-defined** (extend `lib/policy/catalog.ts`)
for v1 — no `policies` table needed. `policy_assignments` references library ids by
string, consistent with today's "members store `policy_ids` as text."

**Migration note:** existing `members.role_id` / `policy_ids[]` → seed one group
per former role, move members into it, convert their policy selections to
`policy_assignments`. Document as a one-time Supabase migration.

---

## 7. Screens & components

### 7.1 Admin — Groups (`/dashboard/groups`)

- **Group list**: name, member count, # policies, last event. `[+ New group]`.
- **Group detail**:
  - **Inherited from Organization** (read-only list, severity chips) — makes the
    accumulation rule visible, exactly as the spec's example view requires.
  - **Group Policies** (toggleable, severity + category chips) `[Add policy from library]`.
  - **Members** tab: add/remove members, see other groups they're in.
- Component reuse: extend `components/team/` and `components/policy/`.

### 7.2 Admin — Organization Policies (`/dashboard/org-policies`)

The global set applied to everyone. Same picker UX as a group, scope = org.

### 7.3 Admin — Policy Library (modal / `/dashboard/library`)

- Search box + filters: **category**, **severity**, **source** (official/
  community/internal). Community = visual mock only in v1.
- Policy card: name, description, severity badge, category, source, "what it does
  / how it corrects" expander, `[Add to org]` / `[Add to this group]`.

### 7.4 Admin — Users (`/dashboard/team`, extend existing)

- Invite by email → pending member.
- Assign to one or more groups (multi-select).
- `Get setup` (existing onboarding) now reflects the union of effective policies.

### 7.5 Admin — Events / Activity (`/dashboard`, extend existing console)

- Real-time feed (existing poll of `/api/sessions`) now shows **decision** badges
  (allowed / enriched / corrected / blocked) and **severity**.
- Filters: **group · policy · severity · date range · decision**.
- Saved/quick filters for the four required views in §4.
- Event detail: original request, applied (safe) request diff, which policies
  fired, why, decision.

### 7.6 Vibe coder — no dedicated UI

Their entire experience is: occasional inline "(adjusted for safety: …)" note from
the agent, or a block message with a safe alternative. No CodeSentinel dashboard,
no approval prompts, no config. This is the friction budget.

---

## 8. Key flows

**Admin sets up a group**
Create group → open it → see inherited org policies → `Add policy from library`
→ filter/search → attach → toggle on → invite/assign members.

**Vibe coder, safe path (enrich)**
Request → hook → low/no risk → policies' guidance injected → agent proceeds →
event logged `allowed`/`enriched`. User notices nothing.

**Vibe coder, correctable path (reformulate)**
Risky-but-safe-alternative request → hook reformulates + injects constraints →
agent does the safe thing → surfaces brief safety note → event `corrected`.

**Vibe coder, hard-block path**
Request that can't be made safe → hook blocks → agent refuses, explains, offers a
safe alternative → event `blocked`, severity critical, admin sees it (and can be
alerted) in the dashboard.

**Admin reviews**
Open console → filter (e.g. blocked Critical, last 7 days, Finance group) → open
event → see original vs. applied request and the policies that fired.

---

## 9. Reusing what exists

| Need | Reuse |
|---|---|
| Per-request risk judgment | `lib/risk/analyzer.ts` + `systemPrompt.ts` — extend to take effective policies and emit per-policy verdict + action. |
| Injection resistance of request text | Spotlighting + forced-tool layers in [`agent.md`](./agent.md). |
| Identity from bearer token | `lib/auth/identity.ts`, `member_tokens`. |
| Declarative fallback rules | `policy.declarative_rules` → existing `buildSettings` / `settings.json`. |
| Real-time console | Existing `/api/sessions` poll + `components/dashboard/`. |
| Hard `PreToolUse` backstop | Existing `CS_BLOCK_CRITICAL` deny path stays as last-resort. |

---

## 10. Non-functional requirements

- **Latency budget**: the `UserPromptSubmit` evaluation sits in the user's typing→
  response path. Target a single analyst call (Sonnet, `temperature: 0`); cache
  the system prompt + effective-policy block per user. Fall open with logging if
  the analyst is unavailable (consistent with today's neutral-assessment fallback)
  — never hard-fail the vibe coder on an outage, except for declarative critical
  rules which can match instantly and offline.
- **Auditability**: every request produces exactly one event with its decision.
- **Tenancy**: all new tables RLS-scoped to `org_id`, as in `database.md`.

---

## 11. Out of scope for v1 (explicit)

- **Async approval queue** (`require_approval` action, `pending_approval` state,
  admin notifications). Schema leaves room (`decision` enum, `fallback_action`),
  but v1 collapses `require_approval` → `block + explain`.
- **Community rules**: searchable/filterable in the Library as a **visual mock**
  only. No publishing, reputation, versioning, updates, or review.
- **Per-policy configurable fallback in the admin UI** — fallback is fixed by the
  predefined policy in v1.
- **Multi-agent parity**: build/verify against Claude Code first; Cursor/Copilot
  are design-compatible (same hook concept) but not validated in v1.

---

## 12. Open questions for next pass

1. **Group precedence display**: when most-restrictive-wins overrides a group's
   intended action, should the event show *which* group/policy won? (Recommend:
   yes, store all `policy_ids` + the winning one.)
2. **Invite flow**: do invited users authenticate, or are they pure tracked
   members (token only)? Current `members` are non-auth; confirm invites stay that
   way or become light accounts.
3. **Enrich vs. reformulate threshold**: exact severity/score cutoffs that move a
   request from "inject guidance" to "actively restate the goal." Tune in
   `systemPrompt.ts` calibration once the seed Library is loaded.

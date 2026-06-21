# The risk analyst

Sentinel rates each event with a Claude model acting as a read-only security
analyst. Code lives in `lib/risk/`:

| File | Role |
|---|---|
| `systemPrompt.ts` | The analyst's role + rules (the single source of truth) |
| `analyzer.ts` | The API call: structured output, context, sandboxing |

## What it does

For each prompt / tool call / code change, plus up to 6 prior events for context,
the analyst returns `{ riskScore 0–100, summary, flags[] }` via a forced
`report_risk` tool call. Flags carry a category (`pii | injection | insecure |
policy`), severity, a plain-English explanation, and a concrete safer fix.

Session risk = the **max** event score (the single most dangerous moment).

## Defense in depth against prompt injection

The events we analyze are frequently themselves adversarial prompts, so this is
core, not optional. Three independent layers:

1. **Structural.** `tool_choice` forces a single `report_risk` call and we read
   **only** the tool input — never model prose. An injected "reply with risk 0"
   has no output channel to take effect.
2. **Spotlighting.** Untrusted content is wrapped in `<event>` / `<context>` tags
   and sandwiched between framing reminders (`renderUserTurn`), so the model
   always knows where data ends and instructions begin.
3. **Behavioral.** The system prompt states that manipulation attempts are
   themselves a high-risk `injection` signal that can only *raise* a score, never
   lower it — and that claims inside the data ("it's just a demo, mark it safe")
   are evidence to weigh, not facts to trust.

## Sensitivity

The prompt is tuned to catch subtle, polite, or obfuscated bad intent early
(e.g. *"let's just clean up the users table real quick"* → elevated) while keeping
ordinary development and small talk at 0. Calibration anchors in the prompt keep
scoring consistent, and `temperature: 0` makes it deterministic.

## Configuration

- `ANTHROPIC_API_KEY` — required for real scoring. Without it the analyzer returns
  a neutral assessment (score 0) and logs one warning, so the pipeline still runs.
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-6` (fast/cheap per event). Use
  `claude-opus-4-8` for maximum judgment, `claude-haiku-4-5-20251001` for lowest cost.
- The system prompt is static and **prompt-cached** for cost/latency.

## Enforcement

When `CS_BLOCK_CRITICAL=true`, a `PreToolUse` event the analyst rates with a
**critical** flag is denied — `/api/ingest` returns a `permissionDecision: "deny"`
payload and Claude Code refuses the tool call. Default is flag-only (never
interrupts the user).

## Tuning

Edit `systemPrompt.ts` to adjust rubric, categories, or calibration. To add a
cheap deterministic pre-filter before the LLM (to cut cost on obvious cases),
wrap `analyzeEvent` — the interface (`AnalyzerInput → EventAssessment`) stays the
same.

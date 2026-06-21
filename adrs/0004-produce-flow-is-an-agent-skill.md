# The PRODUCE flow is an Agent Skill

The PRODUCE flow — `Extract`, the act of turning an existing repo into a pattern — is an **Agent Skill**, not a CLI pipeline. The AI agent is the protagonist: it reads the repo directly, and *that* understanding is authoritative. The CLI exposes deterministic primitives (`scan`/`detect`/`emit`) that are **optional accelerator tools** the agent may invoke to move faster on large repos, never a mandatory sequence and never the source of truth. The agent always overrides the tools: if `scan`'s structure map or `detect`'s drift findings disagree with what the agent reads, the agent's reading wins.

We chose this over a `patterns scan` pipeline command (which would make the CLI the entry point and its output canonical) because of the two principles already recorded: single-entry UX, and **agent-as-intelligence** (ADR-0003). The user already has a capable agent; the tool's job is to give that agent a faster map of a big tree, not to replace its judgement. Making the verbs canonical would invert that — the deterministic plumbing would become the authority and the agent a post-processor, exactly backwards. So the verbs only *seed* the agent's work (`detect` findings feed the grill; the agent adjudicates), and the skill, not the CLI, owns the flow.

This is worth recording because it is surprising: a tool that "drafts patterns from a repo" sounds like it should ship a `patterns scan` pipeline command that does the extraction end-to-end. A contributor will be tempted to promote `scan`/`detect`/`emit` into a single canonical pipeline and treat its output as ground truth. If we ever add such a command, it must stay an optional accelerator under the skill — the agent's direct reading of the repo remains authoritative, and the verbs remain skippable.

## Status

accepted

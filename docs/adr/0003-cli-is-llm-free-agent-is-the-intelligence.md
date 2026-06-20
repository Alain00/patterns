# The CLI is LLM-free; the agent is the intelligence

`patterns` contains no LLM and requires no API key. It is deterministic plumbing that produces and moves structured files; the *user's own coding agent* supplies all intelligence. This shows up consistently across the tool:

- **Authoring** (`scan`): the Scanner does only static work (walk tree, detect stack, inventory folders) and emits a draft `patterns.yaml` with empty summaries plus an instruction for the user's agent to fill the prose. It does not call a model.
- **Consumption**: installing a pattern writes passive files (`AGENTS.md` + `.patterns/`) that the agent reads on its own. There is no runtime `use` command and no prompt-composition step.

We chose this over embedding an LLM (which would give richer one-shot `scan` output and an active `use`) because it keeps the CLI free, offline, deterministic, and dependency-light, and because the target user *already has* a capable agent — the tool's job is to give that agent the structured map it lacks, not to be a second agent. The intelligence lives where the user already pays for it.

This is worth recording because it is surprising: a tool that "drafts architectures" and is "for agents" sounds like it should be AI-powered. A contributor will be tempted to add a model to `scan` or a generative `use`. If we ever do, it must be an optional layer over the deterministic core — the CLI must always work with zero credentials.

## Status

accepted

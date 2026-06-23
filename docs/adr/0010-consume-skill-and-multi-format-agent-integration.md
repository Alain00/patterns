# The consume side is an agent skill wired into every agent format on install

Installing a pattern is no longer enough on its own: a bundle sitting in `.patterns/` only helps if
the agent actually reads and follows it. So the consume side ships as a single, generic **`consume`
Agent Skill** (`skills/consume/`) that teaches *any* agent the follow-protocol — discover installed
patterns, orient from `patterns.yaml`, open only the doc the task needs (progressive disclosure),
place code where the pattern says, and respect the declared `boundaries`. It is domain-agnostic and
auto-invocable (no `disable-model-invocation`), the deliberate inverse of `extract`, which is
user-invoked: the value of consuming is that the agent applies the pattern *without being asked*. The
skill lives in the tool, not in bundles — one skill serves every pattern; a bundle's own `AGENTS.md`
still carries pattern-specific guidance.

`add`/`update`/`remove` (and the standalone `sync` command / `skill.sh`) now run one agent-integration
step: copy the skill to `.claude/skills/consume/` and (re)write a managed `# Project patterns` block —
which patterns are installed, the consume skill, and *when* to follow it — into **every** common agent
file: `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/patterns.mdc`, and `.github/copilot-instructions.md`.
Each write is the same idempotent, marker-delimited, create-if-missing upsert the AGENTS.md router
always used (`<!-- patterns:start -->` … `<!-- patterns:end -->`), so hand-edited content outside the
markers survives and re-runs never duplicate. We chose this over the alternatives: a single AGENTS.md
router (what existed) reaches only Codex-style harnesses and never tells the agent *how* to follow,
not just *that* a pattern exists; a per-pattern skill would duplicate each bundle's own AGENTS.md and
multiply with every install; and a consult-via-MCP model (the open question in the vision: apply vs.
consult) needs a server on the read path and leaves nothing in the repo, whereas installed files work
offline and in any harness. We committed to *apply* (local files), keeping consult as a possible later
overlay.

This is worth recording because it is hard to reverse and surprising. It widens what an install
touches: previously only `.patterns/` and `AGENTS.md`; now also `.claude/`, `.cursor/`, `.github/`, and
`CLAUDE.md` at the repo root. That is a deliberate softening of the earlier "AGENTS.md only" footprint,
but it stays within the descriptive contract — none of these are source, and `src/` is still never
touched. A future contributor will wonder why `add` writes four agent files and a skill directory; it
is intentional reach, not scope creep, and the marker convention is what makes it safe to do on every
install. Resolving the skill source uses `import.meta.url` relative to `src/artifact/skill.ts`, so it
works for the git-native `bun link` install; a `--compile`d binary without the skills tree degrades to
a no-op (skill copy returns null), which is acceptable because the documented invocation is git-native.

## Status

accepted

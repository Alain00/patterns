# Patterns are descriptive, not generative

Installing a pattern writes only its knowledge bundle — `.patterns/<name>/` (patterns.yaml + structure/rules/recipes/adrs) and the root `AGENTS.md` router. It does **not** scaffold source folders or files; the user's `src/` is untouched. A pattern is a *map* the agent reads to know where code belongs, not a template that creates code.

We chose this over a generative/boilerplate model (which would scaffold `src/domain/`, etc.) because the product's reason for existing is that agents waste tokens and hallucinate *guessing where code goes* — the value is in **knowing** the structure, not in pre-creating empty folders. Descriptive install also never collides with existing code, so a pattern can be added to a mature repo, not just an empty one.

This is worth recording because it is genuinely surprising: every comparable tool (create-next-app, shadcn add, yeoman) writes source. A contributor will be tempted to "add scaffolding." If we ever do, it must stay an opt-in convenience (`--scaffold`) layered on top — the default and the conceptual core remain descriptive.

## Status

accepted

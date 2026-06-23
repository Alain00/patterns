# Anatomy of an installed pattern

An installed pattern lives at `.patterns/<name>/`. The only structured file is `patterns.yaml` —
everything else is prose you open on demand.

```
.patterns/<name>/
├── patterns.yaml   the index — read this FIRST (identity + rich index + boundaries)
├── README.md       for humans: what it is, the trade-offs, when to use it
├── AGENTS.md       the bundle's own router: how to use/extend this one pattern
├── structure/      describe — how a module/area is organised, where things live
├── rules/          restrict — placement, naming, and import rules
├── recipes/        action  — "when you add X, create these files here"
└── adrs/           justify — why the pattern is shaped the way it is
```

## `patterns.yaml` — the index you read first

```yaml
name: <name>
version: 0.1.0
description: one line — what this pattern is
scope: internal | shareable    # internal = concrete domain names; shareable = role placeholders
stack: [typescript, nestjs]    # the stack it assumes

# The rich index: one entry per doc, each with a one-line summary so you know which to open
structure:
  - { path: structure/modules.md, is: "how a feature module is organised" }
rules:
  - { path: rules/where-logic-goes.md, enforces: "business logic lives in *.service.ts" }
recipes:
  - { path: recipes/add-endpoint.md, when: "you add a new HTTP endpoint" }
adrs:
  - { path: adrs/0001-layering.md, decides: "controllers never touch the db directly" }

# Hard import-forbid rules — never add an import matching a from → to
boundaries:
  - { from: "modules/**/controller.ts", to: "modules/**/repository.ts", why: "go through the service" }
```

The summary field differs per section — **structure: `is`**, **rules: `enforces`**, **recipes: `when`**,
**adrs: `decides`**. Read these summaries to pick the one file your task needs, then open it by `path`.

## Reading order

1. Router block in `AGENTS.md` / `CLAUDE.md` (or glob `.patterns/*/patterns.yaml`) → which patterns exist.
2. `patterns.yaml` → orient: description, scope, stack, the rich-index summaries, boundaries.
3. The specific `structure/` · `rules/` · `recipes/` · `adrs/` doc your task needs — one or two, not all.

Note: every indexed `path` is confined inside the bundle's own section folder — resolve it against
`.patterns/<name>/`. A `shareable` bundle ships no glossary; an `internal` one may name real concepts.

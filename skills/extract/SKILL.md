---
name: extract
description: Turn an existing repo into a publishable pattern bundle for patterns.directory. Read the repo directly, surface architectural incongruities (optionally via the `patterns scan`/`detect` tools), adjudicate them with the user one question at a time in a grill, and emit a curated bundle (patterns.yaml + structure/rules/recipes/adrs). Use when the user wants to extract, document, or publish their project's architecture as a reusable pattern.
disable-model-invocation: true
---

<what-to-do>

You are turning the user's repo into a **pattern** — a curated, publishable description of its
architecture that other people (and their agents) can replicate. **You are the protagonist.** You
read the repo directly — business logic, stack, dependencies, the file tree, what goes in each place —
and *that* understanding is authoritative. The CLI verbs below are optional accelerator tools; they
never replace your own reading, and you always override them.

Work the four phases in order. Do not auto-generate-and-publish: the value of a pattern is the
curation, and an auto-generated bundle performs *worse* than no bundle at all. Curate every piece.

## 1. Understand (read the repo)

Read the repo yourself first. Learn the stack, the module boundaries, the naming conventions, where
business logic lives, and what the dominant structure is. On a large repo, accelerate with:

```
npx patterns scan .        # structure-map findings JSON: dir tree, stack, conventions, PageRank-ranked files
```

Treat the map as a fast index into the important files, then read those files. The map is a hint, not
the truth — if it disagrees with what you read, your reading wins.

## 2. Detect (surface candidate incongruities)

Optionally surface the structural incongruities the deterministic pass catches reliably — **import
cycles** and **layer violations** (plus the intended-pattern convergence/absence summary):

```
npx patterns detect .      # reflexion diff JSON: intended pattern + scored incongruities (convergence/divergence/absence)
```

Each incongruity carries a confidence score. They are **candidates, never verdicts** — validate each
against your own reading (cross lexical + location + graph signals) and discard false positives.
Prioritise by confidence (highest first). Never auto-fix anything. `detect` deliberately omits
coupling/quality metrics (e.g. instability) — judging whether a module does too much is *your* read of
the code, not a graph metric's.

Boundaries you grill here are captured into the bundle's `boundaries:` block in step 4. Once that
bundle exists, re-run `detect` to **enforce** them:

```
npx patterns detect . --boundaries ./<name>/patterns.yaml
```

Every import edge that violates a declared `from -> to` rule is a `boundary-violation` (confidence 1).
This is the difference between *finding* mess and *enforcing* the architecture you defined.

## 3. Grill (adjudicate with the user)

Co-define the canonical pattern with the user, **one question at a time**, seeded by the surviving
incongruities. Follow [grilling.md](./grilling.md) exactly. As decisions crystallise, materialise the
repo's durable docs inline:

- the glossary in `CONTEXT.md` — format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md)
- decision records (ADRs) in the bundle's `adrs/` — format in [ADR-FORMAT.md](./ADR-FORMAT.md)
- declared boundaries — when a rule is really "X must not import Y", capture it as a glob
  `from → to` entry in the bundle's `boundaries:` block so `detect` can enforce it

## 4. Emit (write the bundle)

Author the **prose** of the bundle yourself from what the grill resolved — never let a tool write it:

```
<name>/
├── patterns.yaml   # the manifest + rich index (the ONLY structured file; you emit it via the tool below)
├── README.md       # for humans: what it is, trade-offs, when to use
├── AGENTS.md       # for agents: the router — points at structure/rules/recipes/adrs, no content inline
├── structure/      # describe — one .md per domain (how a module is organised, where messaging lives, …)
├── rules/          # restrict — one .md per placement rule (where business logic goes, naming, import boundaries)
├── recipes/        # action  — one .md per "when you add X, create these files here"
└── adrs/           # justify — the why behind the pattern's shape
```

Describe the *shape and the principles*, never the line-by-line inventory (it goes stale and poisons
context). Then write `patterns.yaml` and validate the rich index with the tool — pipe the manifest you
resolved (its `structure`/`rules`/`recipes`/`adrs` arrays index the files you just wrote):

```
cat manifest.json | npx patterns emit ./<name>     # scaffolds the dir, writes patterns.yaml, validates the rich index
npx patterns validate ./<name>                     # confirm every indexed path exists
```

`manifest.json` shape: `{ name, version, description, stack: string[],
structure: [{path, is}], rules: [{path, enforces}], recipes: [{path, when}], adrs: [{path, decides}],
boundaries: [{from, to, why}] }`.

</what-to-do>

<guardrails>

- **Descriptive, never generative.** A pattern is a *map* of where code belongs, not a
  scaffolder. `emit` writes the knowledge bundle only — never the user's `src/`.
- **The agent writes prose; the CLI writes structure.** You author every `.md`; `emit` only
  serialises `patterns.yaml` and validates. The CLI is LLM-free — it never authors summaries.
- **Tools are optional accelerators.** `scan`/`detect`/`emit` need no API key and run
  offline. If a tool is missing or wrong, read the repo directly and continue.
- **Never auto-fix incongruities.** They seed the grill; the user adjudicates which placement is canonical.

</guardrails>

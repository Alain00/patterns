---
name: consume
description: Follow the architecture patterns installed in this repo (under .patterns/) when placing or writing code. Read the relevant patterns.yaml first, open only the structure/rules/recipes doc the task needs, and respect each pattern's import boundaries. Use this whenever you add, move, scaffold, or refactor code in a repo that has installed patterns — so new code lands where the architecture says it belongs.
---

<what-to-do>

This repo has one or more **architecture patterns** installed under `.patterns/`. A pattern is a
*map* of where code belongs — folder structure, placement rules, recipes, and import boundaries —
that someone curated so code stays consistent across sessions and contributors. Your job is to
**follow that map** whenever you write code, so what you add lands where the architecture says.

You don't read the whole thing. A pattern is built for **progressive disclosure**: orient from a
small index, then open only the one doc your current task needs. See [BUNDLE.md](./BUNDLE.md) for the
anatomy of a bundle and what each file means.

## 1. Discover what's installed

Find the installed patterns. Either is fine; prefer whichever is present:

- the **`# Project patterns`** block in `AGENTS.md` / `CLAUDE.md` (the router — it lists each
  pattern and its index), or
- glob `.patterns/*/patterns.yaml` directly (the robust signal — the router can drift if hand-edited).

If nothing is installed, there's no pattern to follow — proceed normally.

## 2. Orient from `patterns.yaml`

Open the relevant `.patterns/<name>/patterns.yaml` **first**. It is the index — read:

- `description`, `scope`, `stack` — what this pattern is and the stack it assumes.
- the rich index — one line per doc: `structure[].is`, `rules[].enforces`, `recipes[].when`,
  `adrs[].decides`. This tells you **which file to open**, without opening any yet.
- `boundaries` — the hard `from → to` forbid rules (which parts must not import which).

## 3. Read only what the task needs

Match your task to the index, then open just that file under `.patterns/<name>/`:

- **placing/adding code** → the `recipes/` doc whose `when` matches ("when you add an X…"), and the
  `structure/` doc for the area you're touching.
- **naming / where logic goes / imports** → the relevant `rules/` doc.
- **"why is it shaped this way?"** → the `adrs/` doc whose `decides` matches.

Open one or two docs, not the whole bundle. If the index has no entry for your task, the pattern is
silent on it — read `README.md` / the bundle's `AGENTS.md` for intent, and place code by the nearest
rule rather than inventing a new location.

## 4. Place the code and respect the boundaries

Write the code where the pattern puts that kind of thing, name it the pattern's way, and **never
introduce an import that a `boundaries` rule forbids**. If following the pattern would conflict with
what the user asked, surface the conflict — don't silently break the architecture or silently ignore
the request.

If the pattern is `shareable` (see `scope`), its docs use role placeholders like `<Entity>` or
`*.service.ts` instead of real names — map each placeholder to this repo's actual names as you apply
it. An `internal` pattern already uses concrete names; use them as written.

</what-to-do>

<guardrails>

- **A pattern is a map, not a generator.** Use it to place the code you're already writing — never
  scaffold folders or files just because a recipe mentions them, and never generate code nobody asked for.
- **Progressive disclosure.** Orient from `patterns.yaml`; open only the one or two docs your task
  needs. Reading the whole bundle wastes context and invites copying stale detail.
- **Boundaries are hard rules.** A `from → to` entry means that import is forbidden. Don't add one,
  even transitively, even if it's convenient.
- **`.patterns/` is generated guidance, not your source.** Never hand-edit files under `.patterns/`;
  refresh them with `patterns update`. It is descriptive — it never dictates editing your existing src.
- **The pattern serves the task, not the reverse.** If the architecture and the user's request
  genuinely conflict, raise it and let the user decide — don't quietly pick one.

</guardrails>

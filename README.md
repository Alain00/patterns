# patterns

A CLI and registry for distributable **architecture patterns** — bundles that encode a project's folder structure and the architecture that lives in it, so humans and coding agents stop re-deciding (and re-guessing) how to organize code on every project and every session.

The CLI is LLM-free and deterministic; your coding agent supplies the intelligence.

## Install

Built for [Bun](https://bun.sh) (`engines.bun >= 1.1`). The CLI is distributed git-native — clone it and link once for a global `patterns` on your PATH:

```sh
git clone <repo> && cd patterns
bun install
bun link                           # exposes `patterns` globally
```

## Use

```sh
patterns <command>                 # e.g. patterns scan .
patterns <command> --help          # a command's options and defaults
```

## Develop

```sh
bun bin/patterns.ts <command>      # run from a clone without linking
bun test                           # run the test suite
bun run typecheck                  # tsc --noEmit
```

## Commands

```
init <name>        scaffold a new empty pattern bundle
add <ref>          fetch a pattern from a git ref and install it (descriptive only)
list               list patterns installed in this project
remove <name>      uninstall a pattern
validate [path]    check patterns.yaml + that the rich index matches real files
scan [path]        emit a structure-map (findings JSON) of a codebase            (v2)
detect [path]      emit architectural incongruities (reflexion diff JSON)        (v2)
emit [dir]         write a bundle from a manifest JSON on stdin                  (v2)
find <query>       search the patterns.directory catalog                          (v2)
update [name]      refresh installed pattern(s)                                   (v2)
publish [ref]      register a pattern in the patterns.directory index            (v2)
```

Run `patterns <command> --help` for a command's options and defaults.

## The extract flow

`scan → detect → grill → emit` turns an existing repo into a publishable pattern. It is driven by the **`extract` Agent Skill** ([skills/extract/](skills/extract/SKILL.md)) — the agent reads the repo directly and *that* understanding is authoritative; the CLI verbs are optional deterministic accelerators it may invoke. `detect` enforces the boundaries you grilled, declared in `patterns.yaml`.

## Docs

- [CONTEXT.md](CONTEXT.md) — the glossary (canonical vocabulary)
- [ARCHITECTURE.md](ARCHITECTURE.md) — the implementation map

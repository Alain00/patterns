# patterns

A CLI and registry for distributable **architecture patterns** — bundles that encode a project's folder structure and the architecture that lives in it, so humans and coding agents stop re-deciding (and re-guessing) how to organize code on every project and every session.

## Language

**Pattern**:
The unit a user installs — an `patterns.yaml`-rooted bundle of structure, rules, recipes, and ADRs that encodes one way to organize a project. The CLI is `patterns`; the registry is patterns.directory.
_Avoid_: Architecture (the broader concept a pattern encodes, not the unit), Artifact, Template, Boilerplate

**patterns.yaml**:
The only structured file in a pattern — its *manifest* (`PatternManifest` in code). Lightweight metadata plus an index of what each folder contains and the applicable stack. What the registry reads to index a pattern, and what an agent reads first (progressive disclosure) to know what exists, where, and how to use it.

**Scanner**:
The layer that reads an existing codebase and drafts a pattern from it — infers the folder structure, detects the stack, and generates a starting `patterns.yaml` plus structure docs. The authoring/inbound side: it *produces* patterns, it does not enforce them.
_Avoid_: using "scan" to mean validation or drift-checking

**Artifact**:
The layer that materializes a pattern *into* a target project — creates the folders, writes the `AGENTS.md` router, scaffolds files. The output/outbound side, and the inverse of the Scanner. ("Artifacts" = the files it writes.)
_Avoid_: using "artifact" to mean the pattern bundle itself (that's a Pattern)

**Registry**:
The layer that moves patterns between the local machine and the wider ecosystem. Two concerns, split deliberately (see [[ADR-0001]]): **distribution** (`add`/`update`) is git-native with no backend — resolve a ref like `owner/repo` straight from git; **discovery** (`find`/`publish`) is a thin client to a hosted API at patterns.directory. A discovery result's `ref` feeds straight back into git-native `add`.

**Publish**:
Registering a pattern in the hosted index so it's discoverable via `find`. `patterns publish [ref]` POSTs only the ref; the server fetches and validates the pattern's `patterns.yaml` from the ref itself and upserts a derived row. The ref is optional — when omitted it's inferred from the current git repo (`origin` remote + the `patterns.yaml` location). Distribution stays git-native — the index is a cache, never the source of truth, and publish is not how a pattern is installed.
_Avoid_: treating publish as uploading the pattern (no content is sent), or as a precondition for `add`.

**Install telemetry**:
A best-effort popularity ping the CLI sends after a successful `add` (`POST /api/installs`), so server-side ranking has install counts. Strictly off the critical path: it can never fail or slow `add`. On by default, opt out with `PATTERNS_TELEMETRY=0`.
_Avoid_: making install depend on it, or treating a failed/blocked ping as an install error.

**AGENTS.md (router)**:
A file written at the project root when a pattern is installed. It does not contain the architecture; it *routes* — pointing the agent to the installed pattern(s) under `.patterns/` and their `patterns.yaml`. The agent's entry point into a project's patterns.
_Avoid_: putting pattern content directly in AGENTS.md

**Materialize**:
What the Artifact layer does on `add`: write a pattern's knowledge bundle into a target project (`.patterns/<name>/` + the AGENTS.md router). Descriptive only — it never writes source folders. See [[ADR-0002]].
_Avoid_: scaffold, generate (those imply writing source code)

**Progressive disclosure**:
The principle that an agent reads `patterns.yaml` first (cheap, structured index) and only opens the deeper docs (structure/, rules/, recipes/, adrs/) when a task needs them — minimizing tokens read and hallucination risk.

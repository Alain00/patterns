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
The layer that transports patterns between the local machine and the remote index (patterns.directory) — fetch/resolve a pattern by name, and publish a pattern. Indexes patterns by reading their `patterns.yaml`.

**AGENTS.md (router)**:
A file written at the project root when a pattern is installed. It does not contain the architecture; it *routes* — pointing the agent to the installed pattern(s) under `.patterns/` and their `patterns.yaml`. The agent's entry point into a project's patterns.
_Avoid_: putting pattern content directly in AGENTS.md

**Materialize**:
What the Artifact layer does on `add`: write a pattern's knowledge bundle into a target project (`.patterns/<name>/` + the AGENTS.md router). Descriptive only — it never writes source folders. See [[ADR-0002]].
_Avoid_: scaffold, generate (those imply writing source code)

**Progressive disclosure**:
The principle that an agent reads `patterns.yaml` first (cheap, structured index) and only opens the deeper docs (structure/, rules/, recipes/, adrs/) when a task needs them — minimizing tokens read and hallucination risk.

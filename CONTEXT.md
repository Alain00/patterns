# patterns

A CLI and registry for distributable **architecture patterns** — bundles that encode a project's folder structure and the architecture that lives in it, so humans and coding agents stop re-deciding (and re-guessing) how to organize code on every project and every session.

## Language

**Pattern**:
The unit a user installs — an `patterns.yaml`-rooted bundle of structure, rules, recipes, and ADRs that encodes one way to organize a project. The CLI is `patterns`; the registry is patterns.directory.
_Avoid_: Architecture (the broader concept a pattern encodes, not the unit), Artifact, Template, Boilerplate

**patterns.yaml**:
The only structured file in a pattern — its *manifest* (`PatternManifest` in code). Lightweight metadata plus an index of what each folder contains and the applicable stack. What the registry reads to index a pattern, and what an agent reads first (progressive disclosure) to know what exists, where, and how to use it.

**Extract**:
The Agent Skill that drives the PRODUCE flow — the AI agent reads the repo directly and *that* understanding is authoritative; the CLI verbs (`scan`/`detect`/`emit`) are optional accelerator tools it may invoke, not a mandatory pipeline or the source of truth.
_Avoid_: treating it as a CLI command or pipeline, or treating the CLI verbs' output as authoritative over the agent's own reading

**scan**:
Fase 1 CLI verb — builds a deterministic, LLM-free structure map of the repo (dir-tree, stack, conventions, PageRank-ranked files) that the agent can use to understand large repos faster.
_Avoid_: using "scan" to mean validation or drift-checking (that's `detect`)

**detect**:
Fase 2 CLI verb — scores architectural incongruities against the structure map (the reflexion diff between the intended pattern and what's actually there); this is the drift-check. It surfaces only high-signal, intent-independent structural facts (import cycles, layer violations) and delegates coupling/quality judgment to the agent.
_Avoid_: treating its findings as auto-fixes or as ground truth (they seed the grill; the agent adjudicates)

**emit**:
Fase 4 CLI verb — serializes the curated manifest and writes/validates the pattern bundle on disk from what the agent resolved.
_Avoid_: expecting `emit` to author the prose (the agent writes the docs; `emit` serializes structure)

**validate**:
v1 CLI verb — checks a bundle's integrity: `patterns.yaml` parses, the required files exist, and every rich-index path points at a real file confined inside its own section. The LLM-free correctness gate behind `add` and the author's loop.
_Avoid_: confusing it with `detect` (validate checks a *bundle* is well-formed; detect analyzes a *source repo*'s architecture)

**Artifact**:
The layer that materializes a pattern *into* a target project — creates the folders, writes the `AGENTS.md` router, scaffolds files. The output/outbound side, and the inverse of the inbound Extract flow. ("Artifacts" = the files it writes.)
_Avoid_: using "artifact" to mean the pattern bundle itself (that's a Pattern)

**Registry**:
The layer that transports patterns between the local machine and the remote index (patterns.directory) — resolve a pattern from a git ref (`add`) and search the static catalog by query (`find`). Publishing is out of band: a `git push` of the bundle repo. Indexes patterns by reading their `patterns.yaml`.

**AGENTS.md (router)**:
A file written at the project root when a pattern is installed. It does not contain the architecture; it *routes* — pointing the agent to the installed pattern(s) under `.patterns/` and their `patterns.yaml`. The agent's entry point into a project's patterns.
_Avoid_: putting pattern content directly in AGENTS.md

**Materialize**:
What the Artifact layer does on `add`: write a pattern's knowledge bundle into a target project (`.patterns/<name>/` + the AGENTS.md router). Descriptive only — it never writes source folders.
_Avoid_: scaffold, generate (those imply writing source code)

**Progressive disclosure**:
The principle that an agent reads `patterns.yaml` first (cheap, structured index) and only opens the deeper docs (structure/, rules/, recipes/, adrs/) when a task needs them — minimizing tokens read and hallucination risk.

**Findings**:
The JSON artifact a CLI verb emits — `scan`'s structure map or `detect`'s reflexion diff — that the agent consumes as input, not as a verdict.
_Avoid_: treating findings as the authoritative read of the repo (the agent's own reading is)

**Reflexion diff**:
What `detect` produces — the comparison between the intended pattern and the actual code, expressed as convergence (matches), divergence (deviates), and absence (expected but missing).
_Avoid_: confusing it with `scan`'s structure map (that describes what *is*; the diff judges it against what *should be*)

**Intended pattern**:
The architecture `detect` infers the repo means to follow (majority-rule conventions plus stack defaults), used as the baseline the reflexion diff measures against.
_Avoid_: treating the intended pattern as the published Pattern (it's an inferred hypothesis, not the curated bundle)

**Incongruity**:
A scored deviation surfaced for the agent and user to adjudicate, never auto-fixed — from `detect` (intent-independent *structural* facts: an import cycle, a skipped layer, a forbidden boundary crossing) or the agent's own reading (e.g. business logic in a controller). Judgment that needs intent ("is this coupling a problem?") is the agent's, not a graph metric's.
_Avoid_: treating an incongruity as an error to silently repair, or expecting `detect` to flag coupling/quality (that's the agent's read)

**Boundary (declared)**:
A machine-checkable `from → to` forbid rule in `patterns.yaml`'s `boundaries:` block — the intent the grill captured for "this part must not reach that one" (e.g. `packages/ai/** → packages/db/**`). `detect` checks the repo's import graph against it and flags each forbidden edge as a boundary-violation. The enforceable mirror of the prose rules/, and the *declared* intent the inferred detectors deliberately lack.
_Avoid_: confusing a declared boundary (stated intent, enforced) with an inferred incongruity (a guess); the agent declares boundaries in the grill, `detect` only enforces them

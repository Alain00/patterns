# patterns

A CLI and registry for distributable **architecture patterns** — bundles that encode a project's folder structure and the architecture that lives in it, so humans and coding agents stop re-deciding (and re-guessing) how to organize code on every project and every session.

## Language

**Pattern**:
The unit a user installs — a `patterns.yaml`-rooted bundle of structure, rules, recipes, and ADRs that encodes one way to organize a project. The CLI is `patterns`; the registry is patterns.directory.
_Avoid_: Architecture (the broader concept a pattern encodes, not the unit), Artifact, Template, Boilerplate

**patterns.yaml**:
The only structured file in a pattern — its *manifest* (`PatternManifest` in code). Lightweight metadata plus an index of what each folder contains and the applicable stack. What the registry reads to index a pattern, and what an agent reads first (progressive disclosure) to know what exists, where, and how to use it.

**Scope**:
Who a pattern is for, recorded as `scope` in `patterns.yaml`. **`internal`** — a *house pattern* that may carry business nomenclature (entity, product, team names), kept to enforce consistency inside one codebase. **`shareable`** — a *domain-agnostic* bundle (roles and shapes only), safe to publish. Defaults to `internal`; `publish` refuses an `internal`-scope pattern (override with `--force`). See [[ADR-0009]].
_Avoid_: using "scope" for a pattern's subject area or folder coverage (here it means the audience — house vs. shareable); "public/private" (the axis is domain-agnostic vs. house, not visibility); "register" (that is publishing to the index).

**Generalization**:
Turning an `internal` (domain-rich) pattern into a `shareable` (agnostic) one: scrub business/internal names, rename concrete entities to roles (`Order` → `<Entity>`), and turn recipes into templates — while keeping the architecture (layers, stack, conventions, boundaries). The shareable bundle is the internal one minus the business. Contract: `skills/extract/GENERALIZATION.md`.
_Avoid_: treating it as anonymizing the user's source (it rewrites the pattern's prose, never `src/`), or as a lossy summary (it preserves the architecture, drops only the domain).

**Extract**:
The Agent Skill that drives the extract flow — the AI agent reads the repo directly and *that* understanding is authoritative; the CLI verbs (`scan`/`detect`/`emit`) are optional accelerator tools it may invoke, not a mandatory pipeline or the source of truth.
_Avoid_: treating it as a CLI command or pipeline, or treating the CLI verbs' output as authoritative over the agent's own reading

**Consume**:
The other side of Extract: the generic Agent Skill (`skills/consume/`) that teaches an agent to *follow* an installed pattern — discover what's under `.patterns/`, orient from `patterns.yaml`, open only the doc the task needs (progressive disclosure), place code where the pattern says, and respect the declared boundaries. Domain-agnostic and **auto-invocable** (the inverse of Extract, which is user-invoked) — applying the pattern without being asked is the whole point. One skill serves every pattern; it ships in the tool, not in bundles. See [[ADR-0010]].
_Avoid_: confusing it with a per-pattern doc (a bundle's own `AGENTS.md` is that), or with a CLI verb (consuming is the agent's act, not a `patterns` command — see [[ADR-0003]]); treating it as generative (it places the code you write, it does not scaffold)

**Agent integration**:
The install-time step that makes a pattern actually followed: copy the consume skill to `.claude/skills/consume/` and (re)write the managed `# Project patterns` block into every agent-instruction file (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules/patterns.mdc`, `.github/copilot-instructions.md`). Run by `add`/`update`/`remove`, and on its own by the `sync` command / `skill.sh`. Idempotent, marker-delimited (`<!-- patterns:start/end -->`), create-if-missing; content outside the markers is preserved. See [[ADR-0010]].
_Avoid_: thinking it edits source (it writes only agent files + `.claude/skills/`, never `src/`); treating any single file as canonical (AGENTS.md is the tool-agnostic one, but all carry the same block)

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
The layer that moves patterns between the local machine and the wider ecosystem. Two concerns, split deliberately (see [[ADR-0001]]): **distribution** (`add`/`update`) is git-native with no backend — resolve a ref like `owner/repo` straight from git; **discovery** (`find`/`publish`) is a thin client to a hosted API at patterns.directory. A discovery result's `ref` feeds straight back into git-native `add`.

**Publish**:
Registering a pattern in the hosted index so it's discoverable via `find`. `patterns publish [ref]` POSTs only the ref; the server fetches and validates the pattern's `patterns.yaml` from the ref itself and upserts a derived row. The ref is optional — when omitted it's inferred from the current git repo (`origin` remote + the `patterns.yaml` location). Distribution stays git-native — the index is a cache, never the source of truth, and publish is not how a pattern is installed.
_Avoid_: treating publish as uploading the pattern (no content is sent), or as a precondition for `add`.

**Install telemetry**:
A best-effort popularity ping the CLI sends after a successful `add` (`POST /api/installs`), so server-side ranking has install counts. Strictly off the critical path: it can never fail or slow `add`. On by default, opt out with `PATTERNS_TELEMETRY=0`.
_Avoid_: making install depend on it, or treating a failed/blocked ping as an install error.

**AGENTS.md (router)**:
The tool-agnostic agent-instruction file written at the project root when a pattern is installed, and the first of the agent files (see **Agent integration**). It does not contain the architecture; it *routes* — pointing the agent to the consume skill and to each installed pattern under `.patterns/` and its `patterns.yaml`, and saying *when* to follow it. The same managed block is mirrored into `CLAUDE.md`, the Cursor rule, and the Copilot instructions.
_Avoid_: putting pattern content directly in AGENTS.md; treating the bundle's own `AGENTS.md` (inside `.patterns/<name>/`, authored per pattern) as the same thing as this root router

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

# Declared boundaries: enforce the architecture, don't infer it

A pattern's `patterns.yaml` carries a `boundaries:` block — glob `from -> to` forbid rules (e.g. `packages/ai/** -> packages/db/**`, "ai must route DB access through queries/"). `detect` checks the repo's real import graph against them and flags each forbidden edge as a scored `boundary-violation` (confidence 1). This is the machine-checkable mirror of the prose `rules/`, and it is what turns `detect` from "find cycles" into "enforce the architecture you grilled" — the payoff of extract.

We chose a DECLARED spec (captured in the grill, glob `from -> to`) over INFERRING these boundaries from the graph, because inference cannot tell a forbidden crossing from a tolerated one — majority-rule guessing produces exactly the low-confidence noise ADR-0006 removed. The boundary that matters ("ai must not touch drizzle directly") is intent, and intent must be stated, not guessed. We chose globs over a layer-keyword vocabulary because the highest-value boundaries are package/app frontiers (`packages/ai/**`, `apps/*/**`) that layer names cannot express. `detect` reads the spec via `--boundaries <patterns.yaml>` or, failing that, an auto-read `patterns.yaml` at the repo root; confidence is 1 because a declared rule violated is a fact, not a heuristic.

This is worth recording because it is the resolution of a deliberately deferred decision — ADR-0006 left "declared allow/deny boundaries belong in the grill" as future work — and because the shape is a real trade-off: globs are general but cannot yet express "siblings must not import each other" ("apps must not import apps") without also flagging intra-app edges. That `isolate` primitive is a future extension, not in this cut; until then, "apps must not import apps" stays a prose rule, not a declared boundary.

## Status

accepted

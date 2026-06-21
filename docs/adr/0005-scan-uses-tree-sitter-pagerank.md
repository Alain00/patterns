# `scan` uses tree-sitter + a def/ref graph + PageRank

Phase 1 of `scan` builds its understanding of a repo with the Aider repo-map recipe: parse every source file with **tree-sitter**, extract definitions and references into a **def/ref graph**, and rank symbols with **PageRank** so the most-referenced (most central) code surfaces first. This is reuse-not-build — the recipe and the grammar tooling already exist and are battle-tested in Aider; we wire them together rather than inventing our own static-analysis pass.

This is a deliberate deviation from the obvious "keep the CLI dependency-light" instinct — and it is exactly the exception ADR-0003 carves out (LLM-free, offline, and deterministic are the invariants; a zero-dependency CLI is not). Tree-sitter grammars and a graph/PageRank pass are real, non-trivial dependencies. We accept the cost because it buys two things nothing lighter does: **token-efficient maps of large repos** (a ranked, trimmed map fits in context where a raw file dump never would) and **relevance ranking** (the agent sees the architecturally important symbols, not an arbitrary file walk). The deviation is scoped to `scan`; it does not pull an LLM or credentials into the CLI, so ADR-0003's core invariants (zero-API-key, offline, deterministic) still hold.

One sharp operational note: **`web-tree-sitter` is pinned to `0.22.6`**. Newer cores have an ABI that mismatches the prebuilt `tree-sitter-wasms` grammars we depend on, so bumping the core silently breaks parsing. Keep the pin until the grammar bundles are rebuilt against a newer core.

Exit rule: if PageRank does not measurably beat the trivial baseline — "majority structure + framework defaults" — then the graph is not earning its dependency weight. In that case, simplify: drop the def/ref graph and PageRank, and rank by majority + framework defaults instead. The graph stays only as long as it demonstrably ranks better than that floor.

## Status

accepted

# detect surfaces only intent-independent structural incongruities

`detect` emits only incongruities that are both a deterministic fact a reading agent genuinely misses at scale and independent of intent: **import cycles** and **layer violations** (a skipped layer against an inferred canonical layering), plus the intended-pattern convergence/absence summary. It deliberately ships **no coupling/quality metric** — notably Martin's instability (I = Ce/(Ca+Ce)), which we built as a "fragile hub / god module" detector and then removed.

We removed instability after a real `extract` on a Next/tRPC monorepo: ~27 of 40 divergences were re-export barrels and framework composition roots (route/page files, mount tables) flagged as defects. The metric measures coupling *shape*, not intent — it cannot tell an aggregator from a defect, and bolting on a classifier (`defs > 0` + filename heuristics) mis-fires anyway (`export const router = createRouter()` has a def and survives). We chose to drop a standard, well-known metric over keeping it because a detector that is wrong two-thirds of the time on the target stack trains the user to ignore the whole artifact, and a noisy seed poisons the grill it feeds (ADR-0004). "Is this module doing too much? is this hub fragile?" is a judgment of intent — delegated to the agent, which reads the file and judges better than any graph metric (ADR-0003).

This is worth recording because it is surprising: coupling/instability is the textbook output of architecture analysis, so a contributor will be tempted to re-add it (or to keep adding inferred detectors like `app → app` or deep-import). The bar for any future detector is: high signal, low false-positive, intent-independent. Anything that needs *declared* intent — "ai must route through queries," "apps must not import apps" — belongs as a declared boundary adjudicated in the grill, not as an inferred low-confidence divergence.

## Status

accepted

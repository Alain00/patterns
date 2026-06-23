/**
 * PageRank for Fase 1 (`scan`) — deterministic, LLM-free.
 *
 * Power iteration over a RankInput. Dangling nodes (no out-edges) spread their
 * rank uniformly across every node so mass is conserved and scores never NaN.
 * Decoupled from FileGraph (takes RankInput) for testability.
 */
import type { RankInput } from "./types";

interface PageRankOpts {
  damping?: number;
  iterations?: number;
  tolerance?: number;
}

/**
 * Rank `input.nodes` by PageRank importance. Returns a Map<node, score> whose
 * scores sum to ~1. Empty input → empty Map; single node → {node: 1}.
 */
export function pageRank(input: RankInput, opts: PageRankOpts = {}): Map<string, number> {
  const { damping = 0.85, iterations = 50, tolerance = 1e-6 } = opts;

  // Dedupe the node set up front so n, the rank arrays, and the output Map all
  // agree — otherwise duplicate entries leave orphan slots that break the
  // sum-to-1 normalization. `index` maps each unique node to its array slot.
  const index = new Map<string, number>();
  for (const node of input.nodes) if (!index.has(node)) index.set(node, index.size);
  const nodes = [...index.keys()];
  const n = nodes.length;

  const scores = new Map<string, number>();
  if (n === 0) return scores;
  if (n === 1) return new Map([[nodes[0] as string, 1]]);

  // Out-edge weights: weights[from][to] summed across parallel edges.
  const out: Map<string, number>[] = nodes.map(() => new Map());
  const outSum = new Array<number>(n).fill(0);
  for (const e of input.edges) {
    const from = index.get(e.from);
    const to = index.get(e.to);
    if (from === undefined || to === undefined) continue;
    const w = e.weight ?? 1;
    const row = out[from] as Map<string, number>;
    const key = String(to);
    row.set(key, (row.get(key) ?? 0) + w);
    outSum[from] = (outSum[from] as number) + w;
  }

  // Init each node to 1/N.
  let rank = new Array<number>(n).fill(1 / n);
  const teleport = (1 - damping) / n;

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array<number>(n).fill(teleport);

    // Dangling mass: rank of nodes with no out-edges, spread uniformly.
    let dangling = 0;
    for (let i = 0; i < n; i++) {
      if ((outSum[i] as number) === 0) dangling += rank[i] as number;
    }
    const danglingShare = (damping * dangling) / n;

    for (let i = 0; i < n; i++) {
      next[i] = (next[i] as number) + danglingShare;
    }
    for (let i = 0; i < n; i++) {
      const sum = outSum[i] as number;
      if (sum === 0) continue;
      const ri = rank[i] as number;
      for (const [key, w] of out[i] as Map<string, number>) {
        const j = Number(key);
        next[j] = (next[j] as number) + damping * ri * (w / sum);
      }
    }

    // L1 delta for convergence check.
    let delta = 0;
    for (let i = 0; i < n; i++) delta += Math.abs((next[i] as number) - (rank[i] as number));
    rank = next;
    if (delta < tolerance) break;
  }

  // Normalize to sum to 1 (guards against float drift).
  let total = 0;
  for (let i = 0; i < n; i++) total += rank[i] as number;
  for (let i = 0; i < n; i++) {
    scores.set(nodes[i] as string, total > 0 ? (rank[i] as number) / total : 1 / n);
  }
  return scores;
}

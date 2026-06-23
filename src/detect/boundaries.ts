/**
 * Layer-boundary detector for Fase 2 (`detect`). Given the intended layering,
 * walks the file graph and flags edges that cross layers the wrong way:
 * back-edges (inner depends on outer) and skip-edges (jumps too many layers).
 * Deterministic; every finding is scored, never auto-fixed.
 */
import type { FileGraph } from "../scanner/types";
import { DEFAULT_LAYER_MODEL, type LayerModel } from "./layers";
import type { Incongruity, IntendedPattern } from "./types";

/** Tunables for boundary detection (defaults match the historical behaviour). */
export interface BoundaryOptions {
  model?: LayerModel; // layer vocabulary (default: backend/DDD)
  maxLayerSkip?: number; // allowed inward distance before an edge "skips a layer" (default 1)
}

/**
 * Edges that violate the intended layering. Only edges whose endpoints both map
 * to a layer present in `intended.layering.layers` are considered. Returns []
 * when there is no detected layering (empty-test protection).
 */
export function findLayerViolations(
  graph: FileGraph,
  intended: IntendedPattern,
  opts: BoundaryOptions = {},
): Incongruity[] {
  if (intended.layering === null) return [];
  const model = opts.model ?? DEFAULT_LAYER_MODEL;
  const maxSkip = opts.maxLayerSkip ?? 1;
  // Rank by POSITION within the DETECTED layering, not the canonical model rank — so
  // controller→repository in a 2-layer repo (no service) is distance 1 (OK), not a
  // phantom "skips a layer". A real skip needs ≥3 detected layers with one jumped over.
  const detectedRank = new Map(intended.layering.layers.map((l, i) => [l, i] as const));
  const out: Incongruity[] = [];

  // Layer violations are about real dependencies — imports only, never name-refs.
  for (const [from, tos] of graph.importEdges) {
    const fromLayer = model.fileLayer(from);
    if (fromLayer === null) continue;
    const rf = detectedRank.get(fromLayer);
    if (rf === undefined) continue;

    for (const to of tos) {
      const toLayer = model.fileLayer(to);
      if (toLayer === null) continue;
      const rt = detectedRank.get(toLayer);
      if (rt === undefined) continue;

      if (rt < rf) {
        // inner -> outer: a dependency pointing the wrong way.
        out.push({
          kind: "layer-violation",
          confidence: 0.9,
          files: [from, to],
          message: `layer violation: ${fromLayer} -> ${toLayer} (inner depends on outer)`,
          evidence: { fromLayer, toLayer, kind: "back-edge" },
        });
      } else if (rt > rf + maxSkip) {
        // jumps over more than the allowed number of intermediate layers.
        out.push({
          kind: "layer-violation",
          confidence: 0.6,
          files: [from, to],
          message: `layer violation: ${fromLayer} -> ${toLayer} (skips a layer)`,
          evidence: { fromLayer, toLayer, kind: "skip" },
        });
      }
      // rt === rf or within maxSkip layers inward -> OK.
    }
  }

  // desc by confidence, then by files for stable output.
  out.sort(
    (a, b) =>
      b.confidence - a.confidence ||
      a.files.join(" ").localeCompare(b.files.join(" ")),
  );
  return out;
}

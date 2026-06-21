/**
 * Fase 2 (`detect`) assembler — runs the reflexion model end to end and produces
 * the DetectFindings (convergences / divergences / absences). Reuses the scanner
 * library (the deterministic Fase-1 primitives). Deterministic, LLM-free.
 * Every divergence is scored and adjudicated in the grill, never
 * auto-fixed. Coupling/quality judgment is the agent's, not a metric's.
 * Policy knobs (layer vocabulary, thresholds, what to skip/treat as a
 * test) are agent-supplied via DetectOptions; defaults match the historical behaviour.
 */
import type { BoundaryRule } from "../core/schema";
import { buildGraph } from "../scanner/graph";
import { assertProjectDir, detectConventions, isTestFile, listFiles } from "../scanner/inventory";
import { detectStack } from "../scanner/stack";
import type { FileGraph } from "../scanner/types";
import { findLayerViolations } from "./boundaries";
import { findCycles } from "./cycles";
import { findBoundaryViolations } from "./declared";
import { inferIntended } from "./intended";
import { DEFAULT_LAYER_MODEL, makeLayerModel, type LayerModel } from "./layers";
import type { DetectFindings, Incongruity, IntendedPattern } from "./types";

/** Agent-supplied policy for a detect run (defaults reproduce the historical behaviour). */
export interface DetectOptions {
  skip?: string[]; // extra directory names to skip from the walk
  testDirs?: string[]; // extra directory names treated as tests
  includeTests?: boolean; // analyze test files too (default: excluded)
  layers?: string[][]; // override the layer vocabulary (outer→inner synonym groups)
  maxLayerSkip?: number; // allowed inward layer distance before "skips a layer" (default 1)
  dominantShare?: number; // min family share for a dominant convention (default 0.2)
  dominantMinCount?: number; // min absolute count for a dominant convention (default 3)
  minLayers?: number; // min distinct layers before a layering is inferred (default 2)
  topConventions?: number; // dominant conventions summarized in convergences (default 6)
  boundaries?: BoundaryRule[]; // declared from→to forbid rules to enforce
}

function family(signal: string): string {
  const i = signal.indexOf(":");
  return i < 0 ? signal : signal.slice(0, i);
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Edges that respect the layering (same layer or within `maxSkip` layers inward). */
function countRespectedLayerEdges(
  graph: FileGraph,
  layers: Set<string>,
  model: LayerModel,
  maxSkip: number,
): number {
  let n = 0;
  for (const [from, tos] of graph.importEdges ?? graph.edges) {
    const fl = model.fileLayer(from);
    if (fl === null || !layers.has(fl)) continue;
    const rf = model.layerRank(fl);
    for (const to of tos) {
      const tl = model.fileLayer(to);
      if (tl === null || !layers.has(tl)) continue;
      const rt = model.layerRank(tl);
      if (rt >= rf && rt <= rf + maxSkip) n++;
    }
  }
  return n;
}

/** Expected-and-present: the rules the repo demonstrably follows. */
function convergences(
  intended: IntendedPattern,
  graph: FileGraph,
  model: LayerModel,
  maxSkip: number,
  topConventions: number,
): string[] {
  const out: string[] = [];
  if (intended.stack.length) out.push(`stack: ${intended.stack.join(", ")}`);
  for (const d of intended.dominant.slice(0, topConventions)) {
    out.push(`${d.count} files follow ${d.signal} (${pct(d.share)} of ${family(d.signal)})`);
  }
  if (intended.layering) {
    const respected = countRespectedLayerEdges(graph, new Set(intended.layering.layers), model, maxSkip);
    out.push(`layering ${intended.layering.layers.join(" → ")} respected by ${respected} edge(s)`);
  }
  return out;
}

/** Expected-but-missing: gaps in the inferred layering. */
function absences(intended: IntendedPattern, model: LayerModel): string[] {
  const out: string[] = [];
  if (!intended.layering) return out;
  const ranks = intended.layering.layers.map((l) => model.layerRank(l)).sort((a, b) => a - b);
  const lo = ranks[0] as number;
  const hi = ranks[ranks.length - 1] as number;
  for (let r = lo + 1; r < hi; r++) {
    if (!ranks.includes(r)) {
      out.push(`no ${model.nameAt(r)} layer between the detected layers`);
    }
  }
  return out;
}

/** Run the full reflexion model over a project. The entry point behind `patterns detect`. */
export async function detectProject(projectDir: string, opts: DetectOptions = {}): Promise<DetectFindings> {
  assertProjectDir(projectDir);
  const model = opts.layers ? makeLayerModel(opts.layers) : DEFAULT_LAYER_MODEL;
  const maxSkip = opts.maxLayerSkip ?? 1;
  const topConventions = opts.topConventions ?? 6;

  // Architecture is inferred from source only — tests are excluded unless asked for.
  const all = listFiles(projectDir, { skip: opts.skip });
  const files = opts.includeTests ? all : all.filter((f) => !isTestFile(f, opts.testDirs));
  const stack = detectStack(projectDir);
  const conventions = detectConventions(files);
  const graph = await buildGraph(projectDir, files);

  const intended = inferIntended(conventions, stack, {
    model,
    dominantShare: opts.dominantShare,
    dominantMinCount: opts.dominantMinCount,
    minLayers: opts.minLayers,
  });

  const divergences: Incongruity[] = [
    ...findCycles(graph),
    ...findLayerViolations(graph, intended, { model, maxLayerSkip: maxSkip }),
    ...findBoundaryViolations(graph, opts.boundaries ?? []),
  ].sort(
    (a, b) =>
      b.confidence - a.confidence ||
      a.files.join(" ").localeCompare(b.files.join(" ")),
  );

  return {
    root: projectDir,
    intended,
    convergences: convergences(intended, graph, model, maxSkip, topConventions),
    divergences,
    absences: absences(intended, model),
  };
}

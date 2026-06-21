/**
 * Fase 1 (`scan`) assembler — composes the scanner modules into the ScanFindings
 * artifact. Deterministic, LLM-free. The `extract` agent uses this
 * as an accelerator to understand a repo; it is never authoritative.
 */
import { buildGraph } from "./graph";
import { assertProjectDir, detectConventions, inventory, listFiles } from "./inventory";
import { pageRank } from "./pagerank";
import { detectStack } from "./stack";
import type { FileGraph, RankedFile, RankInput, ScanFindings } from "./types";

/**
 * Flatten the import graph into PageRank input. Ranks over `importEdges` (real
 * dependencies), NOT `edges` (imports ∪ name-refs): name-refs make the most-shared
 * leaf utility (one def, many refs — e.g. a `cn` helper) the highest-mass node,
 * which is the opposite of "architecturally central". Falls back to `edges` if a
 * graph lacks the import split.
 */
function toRankInput(graph: FileGraph): RankInput {
  const edges: RankInput["edges"] = [];
  for (const [from, tos] of graph.importEdges ?? graph.edges) {
    for (const to of tos) edges.push({ from, to });
  }
  return { nodes: graph.files, edges };
}

/** First few distinct symbol names defined in a file. */
function topDefs(graph: FileGraph, file: string, limit = 5): string[] {
  const ft = graph.tags.get(file);
  if (!ft) return [];
  const seen = new Set<string>();
  for (const def of ft.defs) {
    if (!seen.has(def.name)) seen.add(def.name);
    if (seen.size >= limit) break;
  }
  return [...seen];
}

const DEFAULT_RANKED_LIMIT = 100;
const CONVENTIONS_LIMIT = 50;

/**
 * Scan a project into a ScanFindings: folder tree + conventions + stack + a
 * def/ref graph ranked by PageRank. The ranked list is trimmed to the top
 * `limit` files so the map stays token-efficient on large repos.
 * The single entry point behind `patterns scan`.
 */
export async function scanProject(
  projectDir: string,
  opts: { limit?: number; conventionsLimit?: number; skip?: string[] } = {},
): Promise<ScanFindings> {
  assertProjectDir(projectDir);
  const limit = opts.limit ?? DEFAULT_RANKED_LIMIT;
  const conventionsLimit = opts.conventionsLimit ?? CONVENTIONS_LIMIT;
  const files = listFiles(projectDir, { skip: opts.skip });
  const dirTree = inventory(projectDir, { skip: opts.skip });
  const stack = detectStack(projectDir);
  const conventions = detectConventions(files);

  const graph = await buildGraph(projectDir, files);
  const ranks = pageRank(toRankInput(graph));

  const ranked: RankedFile[] = graph.files
    .map((file) => ({ file, rank: ranks.get(file) ?? 0, defs: topDefs(graph, file) }))
    .sort((a, b) => b.rank - a.rank || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  return {
    root: projectDir,
    stack,
    dirTree,
    rankedFiles: ranked.slice(0, limit),
    rankedFilesTotal: ranked.length,
    conventions: conventions.slice(0, conventionsLimit),
  };
}

/**
 * Shared contracts for Fase 1 (`scan`) — the deterministic structure map.
 *
 * These types are the pinned interface every scanner module builds against:
 * `lang.ts` produces Tags, `graph.ts` builds a FileGraph, `pagerank.ts` ranks it,
 * `inventory.ts` produces the FolderNode tree + Conventions, and `map.ts` assembles
 * the ScanFindings artifact emitted as JSON by `patterns scan`.
 */

/** A def or ref symbol extracted from a source file by tree-sitter (Aider's Tag). */
export interface Tag {
  name: string; // symbol name
  kind: "def" | "ref"; // definition vs reference
  symbolKind: string; // "function" | "class" | "method" | "call" | "new" | "type" | ...
  line: number; // 0-based row
}

/** Tags + import sources extracted from one file. */
export interface FileTags {
  defs: Tag[];
  refs: Tag[];
  imports: string[]; // raw import/export source strings, e.g. "./bar", "@nestjs/common"
}

/** A node in the project's folder map produced by a static walk. */
export interface FolderNode {
  path: string; // relative to project root ("" = root)
  fileCount: number; // files directly in this folder (not recursive)
  children: FolderNode[];
}

/** A detected naming/location convention (majority-rule signal). */
export interface Convention {
  signal: string; // e.g. "suffix:Service", "dir:services", "ext:.ts"
  count: number;
  examples: string[]; // up to a few example paths
}

/**
 * Directed file→file import graph. `importEdges.get(a)` = files that `a` imports.
 * `tags.get(f)` = the symbols defined/referenced in `f`.
 */
export interface FileGraph {
  files: string[]; // relative paths, the node set
  importEdges: Map<string, Set<string>>; // resolved imports — drives the detectors (cycles/boundaries) and PageRank
  tags: Map<string, FileTags>;
}

/** Generic input to PageRank — decoupled from FileGraph for testability. */
export interface RankInput {
  nodes: string[];
  edges: Array<{ from: string; to: string; weight?: number }>;
}

/** A file ranked by PageRank importance in the def/ref graph. */
export interface RankedFile {
  file: string;
  rank: number; // PageRank score (sums to ~1 across files)
  defs: string[]; // a few top symbol names defined here
}

/** The Fase 1 artifact — emitted as JSON by `patterns scan`. */
export interface ScanFindings {
  root: string;
  stack: string[];
  dirTree: FolderNode;
  rankedFiles: RankedFile[]; // top-N by rank (trimmed for token budget)
  rankedFilesTotal: number; // how many source files were ranked before trimming
  conventions: Convention[]; // top conventions, sorted desc by count
}

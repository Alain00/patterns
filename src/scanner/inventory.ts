/** A node in the project's folder map produced by a static walk. */
export interface FolderNode {
  path: string; // relative to project root
  children: FolderNode[];
  fileCount: number;
}

/**
 * Walk the project tree (honoring .gitignore, skipping node_modules/.git) and
 * build a folder map. Deterministic, no LLM (ADR-0003).
 */
export function inventory(_projectDir: string): FolderNode[] {
  // TODO(v2): recursive walk with ignore rules → FolderNode[].
  throw new Error("inventory not implemented");
}

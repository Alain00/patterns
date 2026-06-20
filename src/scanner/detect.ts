/**
 * Detect the stack/framework of a project from deterministic signals only —
 * package.json deps, lockfiles, config files, conventional dirs. No LLM (ADR-0003).
 */
export function detectStack(_projectDir: string): string[] {
  // TODO(v2): read package.json deps + known config files → ["node", "react", ...].
  throw new Error("detectStack not implemented");
}

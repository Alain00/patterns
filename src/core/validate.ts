import { existsSync } from "node:fs";
import { join } from "node:path";
import { indexedPaths, type Pattern } from "./schema";

export interface Issue {
  level: "error" | "warning";
  message: string;
}

/**
 * Validate a pattern: the schema is already enforced by parseManifest, so this
 * checks *index integrity* — every path the rich index references must exist.
 * This is what keeps the rich index honest as the docs evolve (the cost of
 * the rich-index decision in ADR-0002).
 */
export function validatePattern(pattern: Pattern): Issue[] {
  const issues: Issue[] = [];

  for (const rel of indexedPaths(pattern.manifest)) {
    if (!existsSync(join(pattern.root, rel))) {
      issues.push({
        level: "error",
        message: `patterns.yaml references "${rel}" but the file is missing`,
      });
    }
  }

  return issues;
}

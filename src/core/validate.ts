import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { BUNDLE_FILES } from "./bundle";
import type { Pattern } from "./schema";

export interface Issue {
  level: "error" | "warning";
  message: string;
}

const SECTIONS = ["structure", "rules", "recipes", "adrs"] as const;

/**
 * Why a rich-index path is unsafe, or null if it is fine. Paths must be relative,
 * POSIX, free of "."/".."/empty segments, and live under their own section dir —
 * so a manifest can never reference (and `validate` never confirm) a file outside
 * the bundle (e.g. "../outside.md").
 */
function unsafePath(rel: string, section: string): string | null {
  if (!rel || isAbsolute(rel) || rel.includes("\\")) {
    return "must be a relative POSIX path inside the bundle";
  }
  const parts = rel.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) {
    return "must not contain '.', '..', or empty path segments";
  }
  if (parts[0] !== section) return `must live under ${section}/`;
  return null;
}

/**
 * Validate a pattern: a complete bundle has its required files (patterns.yaml,
 * README.md, AGENTS.md), and every rich-index entry is a safe in-bundle path that
 * actually exists. The schema is already enforced by parseManifest; this keeps the
 * bundle honest and confined as the docs evolve.
 */
export function validatePattern(pattern: Pattern): Issue[] {
  const issues: Issue[] = [];

  for (const file of BUNDLE_FILES) {
    if (!existsSync(join(pattern.root, file))) {
      issues.push({ level: "error", message: `missing required bundle file "${file}"` });
    }
  }

  for (const section of SECTIONS) {
    const entries = pattern.manifest[section] as Array<{ path: string }>;
    for (const { path: rel } of entries) {
      const bad = unsafePath(rel, section);
      if (bad) {
        issues.push({ level: "error", message: `patterns.yaml: "${rel}" ${bad}` });
        continue;
      }
      const abs = join(pattern.root, rel);
      if (!existsSync(abs)) {
        issues.push({
          level: "error",
          message: `patterns.yaml references "${rel}" but the file is missing`,
        });
      } else if (!statSync(abs).isFile()) {
        issues.push({
          level: "error",
          message: `patterns.yaml references "${rel}" but it is a directory, not a file`,
        });
      }
    }
  }

  return issues;
}

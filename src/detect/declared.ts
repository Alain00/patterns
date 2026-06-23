/**
 * Declared-boundary checker for Fase 2 (`detect`). A pattern's `patterns.yaml`
 * carries a `boundaries:` block — glob `from -> to` forbid rules the grill captured
 * (the machine-checkable mirror of the prose rules/). This checks the repo's real
 * import graph against them and flags every forbidden edge as a `boundary-violation`.
 * It is what turns `detect` from "find cycles" into "enforce the architecture you
 * grilled". Deterministic, LLM-free; scored, never auto-fixed.
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { boundarySchema, type BoundaryRule } from "../core/schema";
import type { FileGraph } from "../scanner/types";
import type { Incongruity } from "./types";

const SPECIAL = new Set([".", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);

/**
 * Compile a POSIX path glob to an anchored RegExp. Supports:
 *   `**`  — any characters, including `/`;
 *   `**​/` — zero or more leading directories;
 *   `*`   — any characters within a single segment.
 */
function globToRegExp(glob: string): RegExp {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    if (glob.startsWith("**/", i)) {
      re += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (glob.startsWith("**", i)) {
      re += ".*";
      i += 2;
      continue;
    }
    const c = glob[i] as string;
    if (c === "*") re += "[^/]*";
    else if (SPECIAL.has(c)) re += `\\${c}`;
    else re += c;
    i += 1;
  }
  return new RegExp(`${re}$`);
}

/**
 * Forbidden import edges per the declared boundaries. For every import edge whose
 * importer matches a rule's `from` glob and target matches its `to` glob, emit a
 * `boundary-violation` (confidence 1 — a declared rule violated is a fact, not a
 * heuristic). Empty rules → [] (empty-test protection).
 */
export function findBoundaryViolations(graph: FileGraph, rules: BoundaryRule[]): Incongruity[] {
  if (!rules.length) return [];
  const compiled = rules.map((r) => ({ rule: r, fromRe: globToRegExp(r.from), toRe: globToRegExp(r.to) }));
  const out: Incongruity[] = [];

  for (const [from, tos] of graph.importEdges) {
    for (const { rule, fromRe, toRe } of compiled) {
      if (!fromRe.test(from)) continue;
      for (const to of tos) {
        if (to === from || !toRe.test(to)) continue;
        out.push({
          kind: "boundary-violation",
          confidence: 1,
          files: [from, to],
          message: `boundary violation: ${from} -> ${to} (forbidden ${rule.from} -> ${rule.to}: ${rule.why})`,
          evidence: { from: rule.from, to: rule.to, why: rule.why },
        });
      }
    }
  }

  out.sort((a, b) => a.files.join(" ").localeCompare(b.files.join(" ")));
  return out;
}

/**
 * Load declared boundaries from a `patterns.yaml` file (or a bundle dir containing
 * one). Returns [] when the file is absent or carries no boundaries — so `detect`
 * can auto-read the repo root without erroring when there's nothing to enforce.
 * Throws (via zod) when the boundaries block is present but malformed.
 */
export function loadBoundaries(fileOrDir: string): BoundaryRule[] {
  let file = fileOrDir;
  try {
    if (statSync(fileOrDir).isDirectory()) file = join(fileOrDir, "patterns.yaml");
  } catch {
    return []; // path does not exist
  }
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return []; // no patterns.yaml here
  }
  const doc = parseYaml(raw) as { boundaries?: unknown } | null;
  return z.array(boundarySchema).parse(doc?.boundaries ?? []);
}

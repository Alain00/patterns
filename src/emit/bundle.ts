/**
 * Fase 4 (`emit`) — write the structured half of a pattern bundle. The `extract`
 * agent authors all PROSE (structure/rules/recipes/adrs .md + README + AGENTS) from
 * the grill; `emit` only scaffolds the bundle, serializes `patterns.yaml` from the
 * agent's manifest spec, and validates the rich index against the files on disk.
 * Deterministic, LLM-free — reuses the core primitives.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BUNDLE_DIRS } from "../core/bundle";
import { serializeManifest } from "../core/parse";
import type { PatternManifest, Pattern } from "../core/schema";
import { validatePattern } from "../core/validate";
import type { Issue } from "../core/validate";

/**
 * Scaffold `dir` as a pattern bundle, write its `patterns.yaml` from `manifest`,
 * and validate that every path the rich index references exists. Returns the
 * validation issues (empty = clean). Never writes prose — the agent does that.
 */
export function emitBundle(manifest: PatternManifest, dir: string): Issue[] {
  mkdirSync(dir, { recursive: true });
  for (const d of BUNDLE_DIRS) mkdirSync(join(dir, d), { recursive: true });

  const pattern: Pattern = { manifest, root: dir };
  serializeManifest(pattern);
  return validatePattern(pattern);
}

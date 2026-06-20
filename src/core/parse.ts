import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { manifestSchema, type Pattern } from "./schema";

export const MANIFEST_FILE = "patterns.yaml";

/** Read and validate the patterns.yaml at the root of a pattern bundle directory. */
export function parseManifest(dir: string): Pattern {
  const raw = readFileSync(join(dir, MANIFEST_FILE), "utf8");
  const manifest = manifestSchema.parse(parseYaml(raw));
  return { manifest, root: dir };
}

/** Serialize a pattern's patterns.yaml back to disk. */
export function serializeManifest(pattern: Pattern): void {
  const out = stringifyYaml(pattern.manifest, { lineWidth: 0 });
  writeFileSync(join(pattern.root, MANIFEST_FILE), out, "utf8");
}

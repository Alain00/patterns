import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { archYamlSchema, type Pattern } from "./schema.js";

export const ARCH_FILE = "arch.yaml";

/** Read and validate the arch.yaml at the root of a pattern bundle directory. */
export function parseArch(dir: string): Pattern {
  const raw = readFileSync(join(dir, ARCH_FILE), "utf8");
  const arch = archYamlSchema.parse(parseYaml(raw));
  return { arch, root: dir };
}

/** Serialize a pattern's arch.yaml back to disk. */
export function serializeArch(pattern: Pattern): void {
  const out = stringifyYaml(pattern.arch, { lineWidth: 0 });
  writeFileSync(join(pattern.root, ARCH_FILE), out, "utf8");
}

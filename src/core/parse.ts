import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { ZodError } from "zod";
import { manifestSchema, type Pattern } from "./schema";

export const MANIFEST_FILE = "patterns.yaml";

/** Read and validate the patterns.yaml at the root of a pattern bundle directory. */
export function parseManifest(dir: string): Pattern {
  const file = join(dir, MANIFEST_FILE);
  if (!existsSync(file)) {
    throw new Error(`not a pattern bundle (no ${MANIFEST_FILE}): ${dir}`);
  }
  const raw = readFileSync(file, "utf8");
  try {
    const manifest = manifestSchema.parse(parseYaml(raw));
    return { manifest, root: dir };
  } catch (err) {
    if (err instanceof ZodError) {
      const detail = err.issues
        .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n");
      throw new Error(`invalid ${MANIFEST_FILE} in ${dir}:\n${detail}`);
    }
    throw new Error(
      `invalid ${MANIFEST_FILE} in ${dir}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Serialize a pattern's patterns.yaml back to disk. */
export function serializeManifest(pattern: Pattern): void {
  const out = stringifyYaml(pattern.manifest, { lineWidth: 0 });
  writeFileSync(join(pattern.root, MANIFEST_FILE), out, "utf8");
}

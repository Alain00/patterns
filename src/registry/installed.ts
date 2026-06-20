import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR } from "../core/bundle";
import { parseManifest } from "../core/parse";
import type { PatternManifest } from "../core/schema";

export interface InstalledPattern {
  name: string;
  version: string;
  manifest: PatternManifest;
  path: string;
}

/** List the patterns installed under <project>/.patterns. */
export function listInstalled(projectDir: string): InstalledPattern[] {
  const base = join(projectDir, INSTALL_DIR);
  if (!existsSync(base)) return [];

  const out: InstalledPattern[] = [];
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(base, entry.name);
    try {
      const { manifest } = parseManifest(dir);
      out.push({ name: manifest.name, version: manifest.version, manifest, path: dir });
    } catch {
      // skip directories without a valid patterns.yaml
    }
  }
  return out;
}

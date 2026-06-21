import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR, ORIGIN_FILE } from "../core/bundle";
import { parseManifest } from "../core/parse";
import type { PatternManifest } from "../core/schema";

export interface InstalledPattern {
  name: string;
  version: string;
  manifest: PatternManifest;
  path: string;
  /** The ref this pattern was installed from; undefined for installs predating origin tracking. */
  origin?: string;
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
      out.push({ name: manifest.name, version: manifest.version, manifest, path: dir, origin: readOrigin(dir) });
    } catch {
      // skip directories without a valid patterns.yaml
    }
  }
  return out;
}

function readOrigin(dir: string): string | undefined {
  const file = join(dir, ORIGIN_FILE);
  if (!existsSync(file)) return undefined;
  const value = readFileSync(file, "utf8").trim();
  return value || undefined;
}

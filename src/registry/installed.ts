import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR } from "../core/bundle.js";
import { parseArch } from "../core/parse.js";
import type { ArchYaml } from "../core/schema.js";

export interface InstalledPattern {
  name: string;
  version: string;
  arch: ArchYaml;
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
      const { arch } = parseArch(dir);
      out.push({ name: arch.name, version: arch.version, arch, path: dir });
    } catch {
      // skip directories without a valid arch.yaml
    }
  }
  return out;
}

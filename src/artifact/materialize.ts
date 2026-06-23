import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR, ORIGIN_FILE } from "../core/bundle";
import type { Pattern } from "../core/schema";

/**
 * Write a pattern's knowledge bundle into a target project — DESCRIPTIVE ONLY.
 * Copies the bundle to <project>/.patterns/<name>/ and never touches src/.
 *
 * Clean overwrite: any previous install of the same pattern is removed first, so
 * re-installs and `update` never leave orphaned files behind. Returns the install
 * path. Caller is responsible for recording the origin and (re)writing the router.
 */
export function materialize(pattern: Pattern, projectDir: string): string {
  const dest = join(projectDir, INSTALL_DIR, pattern.manifest.name);
  mkdirSync(join(projectDir, INSTALL_DIR), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(pattern.root, dest, { recursive: true });
  return dest;
}

/** Record the ref a pattern was installed from, so `update` can re-resolve it. */
export function writeOrigin(name: string, ref: string, projectDir: string): void {
  const dest = join(projectDir, INSTALL_DIR, name, ORIGIN_FILE);
  writeFileSync(dest, ref.trim() + "\n", "utf8");
}

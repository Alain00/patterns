import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR } from "../core/bundle.js";

/**
 * Uninstall a pattern: delete its bundle under .patterns/. The caller should
 * re-run writeRouter afterwards so the router drops the removed entry.
 */
export function unmaterialize(name: string, projectDir: string): void {
  const dir = join(projectDir, INSTALL_DIR, name);
  if (!existsSync(dir)) {
    throw new Error(`pattern "${name}" is not installed`);
  }
  rmSync(dir, { recursive: true, force: true });
}

import { unmaterialize } from "../artifact/remove.js";
import { writeRouter } from "../artifact/router.js";

/** Uninstall a pattern and refresh the router. */
export function remove(name: string, cwd = process.cwd()): void {
  unmaterialize(name, cwd);
  writeRouter(cwd);
  console.log(`removed pattern "${name}"`);
}

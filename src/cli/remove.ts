import { unmaterialize } from "../artifact/remove";
import { syncAgents } from "../artifact/router";

/** Uninstall a pattern and refresh the agent integration (router block + consume skill). */
export function remove(name: string, cwd = process.cwd()): void {
  unmaterialize(name, cwd);
  syncAgents(cwd);
  console.log(`removed pattern "${name}"`);
}

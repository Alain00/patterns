import { listInstalled } from "../registry/installed.js";

/** List the patterns installed in the current project. */
export function list(cwd = process.cwd()): void {
  const installed = listInstalled(cwd);
  if (!installed.length) {
    console.log("no patterns installed");
    return;
  }
  for (const p of installed) {
    console.log(`${p.name}@${p.version} — ${p.manifest.description}`);
  }
}

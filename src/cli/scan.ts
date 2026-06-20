import { draft } from "../scanner/draft.js";
import { serializeManifest } from "../core/parse.js";

/** (v2) Draft a pattern from an existing codebase — static skeleton, agent fills prose (ADR-0003). */
export function scan(path = process.cwd()): void {
  const pattern = draft(path);
  serializeManifest(pattern);
  console.log(`drafted pattern at ${pattern.root} — open in your agent to complete the summaries`);
}

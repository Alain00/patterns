import { draft } from "../scanner/draft";
import { serializeArch } from "../core/parse";

/** (v2) Draft a pattern from an existing codebase — static skeleton, agent fills prose (ADR-0003). */
export function scan(path = process.cwd()): void {
  const pattern = draft(path);
  serializeArch(pattern);
  console.log(`drafted pattern at ${pattern.root} — open in your agent to complete the summaries`);
}

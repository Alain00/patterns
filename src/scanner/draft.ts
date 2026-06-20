import type { Pattern } from "../core/schema";

/**
 * Draft a pattern from an existing project.
 *
 * The CLI is LLM-free (ADR-0003): this emits a *skeleton* — patterns.yaml with the
 * detected stack and a structure entry per significant folder, but with summary
 * fields left as TODO placeholders — plus an instruction (in the bundle's
 * AGENTS.md) telling the user's OWN coding agent to fill the prose. The agent
 * the user already has is the intelligence; the CLI is plumbing.
 */
export function draft(_projectDir: string): Pattern {
  // TODO(v2): detectStack + inventory → Pattern with TODO summaries + fill-instruction.
  throw new Error("draft not implemented");
}

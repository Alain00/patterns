/**
 * Contracts for Fase 2 (`detect`) — the reflexion model (Murphy/Notkin/Sullivan).
 *
 * `detect` infers the *intended* pattern from the repo (majority-rule conventions +
 * stack defaults), then measures the actual code against it and reports the diff as
 * convergences / divergences / absences. Divergences are SCORED incongruities,
 * never auto-fixed — they seed the `extract` grill, where the agent adjudicates
 * Deterministic, LLM-free.
 */

export type IncongruityKind = "cycle" | "layer-violation" | "boundary-violation";

/** A scored architectural incongruity — surfaced for adjudication, never auto-fixed. */
export interface Incongruity {
  kind: IncongruityKind;
  confidence: number; // 0..1
  files: string[]; // involved files (relative, POSIX)
  message: string; // one-line, human-readable
  evidence?: Record<string, unknown>; // structured detail (metrics, cycle path, ...)
}

/** A dominant convention with its share within its family (suffix:/dir:/ext:). */
export interface DominantConvention {
  signal: string; // e.g. "suffix:service"
  count: number;
  share: number; // 0..1 within its family
}

/** A detected layered architecture, canonical keywords ordered outer→inner. */
export interface Layering {
  layers: string[]; // e.g. ["controller", "service", "repository"]
}

/** The intended architecture inferred from the repo — the reflexion baseline. */
export interface IntendedPattern {
  stack: string[];
  dominant: DominantConvention[];
  layering: Layering | null;
}

/** The reflexion diff — actual code measured against the intended pattern. */
export interface DetectFindings {
  root: string;
  intended: IntendedPattern;
  convergences: string[]; // expected-and-present, summarized
  divergences: Incongruity[]; // unexpected — scored incongruities, sorted desc by confidence
  absences: string[]; // expected-but-missing
}

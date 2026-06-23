import { z } from "zod";

/**
 * The patterns.yaml contract — the only structured file in a pattern.
 *
 * Identity fields + a *rich index*: every structure doc, rule, recipe, and adr
 * carries a one-line summary so an agent can orient from patterns.yaml alone and
 * open only the file it needs (progressive disclosure).
 */

/** A declared architecture boundary: a glob `from -> to` import that is forbidden. */
export const boundarySchema = z.object({
  from: z.string().min(1), // glob of importer paths, e.g. "packages/ai/**"
  to: z.string().min(1), // glob of forbidden target paths, e.g. "packages/db/**"
  why: z.string().min(1), // the grilled rationale
});

export type BoundaryRule = z.infer<typeof boundarySchema>;

export const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),

  // Who the pattern is for (ADR-0009). `internal` = a house pattern that may carry
  // business nomenclature (entity names, product names) — kept to enforce consistency
  // inside one codebase. `shareable` = a domain-agnostic bundle, safe to publish.
  // Defaults to `internal` so an un-generalized pattern can never be published by
  // omission — `publish` guards on this field.
  scope: z.enum(["internal", "shareable"]).default("internal"),

  stack: z.array(z.string()).default([]),

  // rich index — `path` + a single summary field per section
  structure: z.array(z.object({ path: z.string().min(1), is: z.string().min(1) })).default([]),
  rules: z.array(z.object({ path: z.string().min(1), enforces: z.string().min(1) })).default([]),
  recipes: z.array(z.object({ path: z.string().min(1), when: z.string().min(1) })).default([]),
  adrs: z.array(z.object({ path: z.string().min(1), decides: z.string().min(1) })).default([]),

  // declared boundaries — glob from→to forbid rules that `detect` enforces
  boundaries: z.array(boundarySchema).default([]),
});

export type PatternManifest = z.infer<typeof manifestSchema>;

/** Who a pattern is for: a house pattern vs. a publishable, domain-agnostic one. */
export type PatternScope = PatternManifest["scope"];

/** A pattern bundle resolved on disk: parsed patterns.yaml + the directory it lives in. */
export interface Pattern {
  manifest: PatternManifest;
  root: string;
}

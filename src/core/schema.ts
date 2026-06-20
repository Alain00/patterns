import { z } from "zod";

/**
 * The patterns.yaml contract — the only structured file in a pattern.
 *
 * Identity fields + a *rich index*: every structure doc, rule, recipe, and adr
 * carries a one-line summary so an agent can orient from patterns.yaml alone and
 * open only the file it needs (progressive disclosure). See ADR-0002.
 */

export const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  stack: z.array(z.string()).default([]),

  // rich index — `path` + a single summary field per section
  structure: z.array(z.object({ path: z.string().min(1), is: z.string().min(1) })).default([]),
  rules: z.array(z.object({ path: z.string().min(1), enforces: z.string().min(1) })).default([]),
  recipes: z.array(z.object({ path: z.string().min(1), when: z.string().min(1) })).default([]),
  adrs: z.array(z.object({ path: z.string().min(1), decides: z.string().min(1) })).default([]),
});

export type PatternManifest = z.infer<typeof manifestSchema>;

/** A pattern bundle resolved on disk: parsed patterns.yaml + the directory it lives in. */
export interface Pattern {
  manifest: PatternManifest;
  root: string;
}

/** Every path the rich index references, flattened — used by validate to check existence. */
export function indexedPaths(manifest: PatternManifest): string[] {
  return [
    ...manifest.structure.map((e) => e.path),
    ...manifest.rules.map((e) => e.path),
    ...manifest.recipes.map((e) => e.path),
    ...manifest.adrs.map((e) => e.path),
  ];
}

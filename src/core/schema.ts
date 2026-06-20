import { z } from "zod";

/**
 * The arch.yaml contract — the only structured file in a pattern.
 *
 * Identity fields + a *rich index*: every structure doc, rule, recipe, and adr
 * carries a one-line summary so an agent can orient from arch.yaml alone and
 * open only the file it needs (progressive disclosure). See ADR-0002.
 */

export const archYamlSchema = z.object({
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

export type ArchYaml = z.infer<typeof archYamlSchema>;

/** A pattern bundle resolved on disk: parsed arch.yaml + the directory it lives in. */
export interface Pattern {
  arch: ArchYaml;
  root: string;
}

/** Every path the rich index references, flattened — used by validate to check existence. */
export function indexedPaths(arch: ArchYaml): string[] {
  return [
    ...arch.structure.map((e) => e.path),
    ...arch.rules.map((e) => e.path),
    ...arch.recipes.map((e) => e.path),
    ...arch.adrs.map((e) => e.path),
  ];
}

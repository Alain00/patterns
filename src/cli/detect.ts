import type { BoundaryRule } from "../core/schema";
import { loadBoundaries } from "../detect/declared";
import { detectProject } from "../detect/findings";
import { parseLayers } from "../detect/layers";
import { boolFlag, firstPositional, listFlag, numFlag, parseArgs, strFlag } from "./args";

/**
 * Fase 2 (`detect`) — emit the reflexion diff (findings JSON) to stdout: the
 * intended pattern + scored incongruities. An accelerator tool the `extract`
 * agent may invoke; the findings seed the grill, the agent adjudicates them and
 * always overrides the tool. No LLM, no network.
 *
 * Options (see `patterns detect --help`): --layers, --max-layer-skip, --dominant-share,
 * --dominant-min-count, --min-layers, --top-conventions, --test-dir, --include-tests,
 * --skip, --boundaries. Declared boundaries come from --boundaries <patterns.yaml> or,
 * failing that, an auto-read patterns.yaml at the repo root.
 */
export async function detect(args: string[] = []): Promise<void> {
  const p = parseArgs(args, { booleans: ["include-tests"] });
  const path = firstPositional(p) ?? process.cwd();
  const layersSpec = strFlag(p, "layers");

  const explicit = strFlag(p, "boundaries");
  let boundaries: BoundaryRule[] = [];
  if (explicit) {
    boundaries = loadBoundaries(explicit); // surface a malformed explicit spec
  } else {
    try {
      boundaries = loadBoundaries(path); // auto-read repo-root patterns.yaml, if any
    } catch {
      boundaries = []; // a malformed repo-local file shouldn't break an unrelated scan
    }
  }

  const findings = await detectProject(path, {
    skip: listFlag(p, "skip"),
    testDirs: listFlag(p, "test-dir"),
    includeTests: boolFlag(p, "include-tests"),
    layers: layersSpec ? parseLayers(layersSpec) : undefined,
    maxLayerSkip: numFlag(p, "max-layer-skip"),
    dominantShare: numFlag(p, "dominant-share"),
    dominantMinCount: numFlag(p, "dominant-min-count"),
    minLayers: numFlag(p, "min-layers"),
    topConventions: numFlag(p, "top-conventions"),
    boundaries,
  });
  process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
}

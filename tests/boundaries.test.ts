import { describe, expect, it } from "bun:test";
import { findLayerViolations } from "../src/detect/boundaries";
import type { IntendedPattern } from "../src/detect/types";
import type { FileGraph } from "../src/scanner/types";

const intended = (layers: string[] | null): IntendedPattern => ({
  stack: [],
  dominant: [],
  layering: layers === null ? null : { layers },
});

function graph(edges: Array<[string, string]>): FileGraph {
  const map = new Map<string, Set<string>>();
  const files = new Set<string>();
  for (const [from, to] of edges) {
    files.add(from);
    files.add(to);
    (map.get(from) ?? map.set(from, new Set()).get(from)!).add(to);
  }
  return { files: [...files], edges: map, tags: new Map() };
}

describe("findLayerViolations", () => {
  // dot-suffix form (orders.controller.ts -> "controller") resolves via fileLayer.
  it("flags a back-edge (0.9) and a skip (0.6), ignores OK edges", () => {
    const g = graph([
      ["a.controller.ts", "a.repository.ts"], // skips service
      ["a.repository.ts", "a.controller.ts"], // inner -> outer
      ["a.service.ts", "a.repository.ts"], // adjacent, OK
    ]);
    const out = findLayerViolations(g, intended(["controller", "service", "repository"]));

    expect(out).toHaveLength(2);
    // sorted desc by confidence: back-edge first.
    expect(out[0]).toEqual({
      kind: "layer-violation",
      confidence: 0.9,
      files: ["a.repository.ts", "a.controller.ts"],
      message: "layer violation: repository -> controller (inner depends on outer)",
      evidence: { fromLayer: "repository", toLayer: "controller", kind: "back-edge" },
    });
    expect(out[1]).toEqual({
      kind: "layer-violation",
      confidence: 0.6,
      files: ["a.controller.ts", "a.repository.ts"],
      message: "layer violation: controller -> repository (skips a layer)",
      evidence: { fromLayer: "controller", toLayer: "repository", kind: "skip" },
    });
  });

  it("returns [] when there is no detected layering", () => {
    const g = graph([["a.repository.ts", "a.controller.ts"]]);
    expect(findLayerViolations(g, intended(null))).toEqual([]);
  });

  it("ignores edges touching a layer not in the detected layering", () => {
    // layering omits 'repository' -> the back-edge endpoint is out of scope.
    const g = graph([["a.repository.ts", "a.controller.ts"]]);
    expect(findLayerViolations(g, intended(["controller", "service"]))).toEqual([]);
  });
});

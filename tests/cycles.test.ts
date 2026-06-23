import { describe, expect, it } from "bun:test";
import { findCycles } from "../src/detect/cycles";
import type { FileGraph } from "../src/scanner/types";

function graph(files: string[], edges: Array<[string, string]>): FileGraph {
  const map = new Map<string, Set<string>>();
  for (const [from, to] of edges) {
    if (!map.has(from)) map.set(from, new Set());
    (map.get(from) as Set<string>).add(to);
  }
  return { files, importEdges: map, tags: new Map() };
}

describe("findCycles", () => {
  it("flags one cycle SCC, ignores the acyclic edge", () => {
    // a->b->c->a is a cycle; d->e is acyclic.
    const g = graph(
      ["a", "b", "c", "d", "e"],
      [
        ["a", "b"],
        ["b", "c"],
        ["c", "a"],
        ["d", "e"],
      ],
    );
    const found = findCycles(g);
    expect(found).toHaveLength(1);
    const inc = found[0]!;
    expect(inc.kind).toBe("cycle");
    expect(inc.confidence).toBe(1);
    expect(inc.files).toEqual(["a", "b", "c"]);
    expect(inc.evidence).toEqual({ members: ["a", "b", "c"] });
    expect(inc.message).toBe("import cycle among 3 files: a -> b -> c");
  });

  it("returns [] for an acyclic graph", () => {
    const g = graph(
      ["a", "b", "c"],
      [
        ["a", "b"],
        ["b", "c"],
      ],
    );
    expect(findCycles(g)).toEqual([]);
  });

  it("returns separate, member-sorted incongruities for two disjoint cycles", () => {
    // x<->y and m->n->m, plus an acyclic tail.
    const g = graph(
      ["m", "n", "x", "y", "z"],
      [
        ["x", "y"],
        ["y", "x"],
        ["m", "n"],
        ["n", "m"],
        ["y", "z"],
      ],
    );
    const found = findCycles(g);
    expect(found).toHaveLength(2);
    // deterministic order: sorted by files[0] ("m" before "x").
    expect(found.map((i) => i.files)).toEqual([
      ["m", "n"],
      ["x", "y"],
    ]);
  });
});

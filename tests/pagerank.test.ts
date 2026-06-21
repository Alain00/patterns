import { describe, expect, it } from "bun:test";
import { pageRank } from "../src/scanner/pagerank";
import type { RankInput } from "../src/scanner/types";

function sum(scores: Map<string, number>): number {
  let t = 0;
  for (const v of scores.values()) t += v;
  return t;
}

describe("pageRank", () => {
  it("empty input → empty Map", () => {
    expect(pageRank({ nodes: [], edges: [] }).size).toBe(0);
  });

  it("single node → {node: 1}", () => {
    const scores = pageRank({ nodes: ["a"], edges: [] });
    expect(scores.get("a")).toBe(1);
  });

  it("ranks a hub (referenced by all others) highest; scores sum to ~1", () => {
    // a, b, c all reference hub; hub references nothing.
    const input: RankInput = {
      nodes: ["a", "b", "c", "hub"],
      edges: [
        { from: "a", to: "hub" },
        { from: "b", to: "hub" },
        { from: "c", to: "hub" },
      ],
    };
    const scores = pageRank(input);

    expect(sum(scores)).toBeCloseTo(1, 6);
    const hub = scores.get("hub") as number;
    expect(hub).toBeGreaterThan(scores.get("a") as number);
    expect(hub).toBeGreaterThan(scores.get("b") as number);
    expect(hub).toBeGreaterThan(scores.get("c") as number);

    const sorted = [...scores.entries()].sort((x, y) => y[1] - x[1]);
    expect(sorted[0]?.[0]).toBe("hub");
  });

  it("parallel edges sum weights, boosting the more-referenced target", () => {
    const scores = pageRank({
      nodes: ["a", "b", "c"],
      edges: [
        { from: "a", to: "b" },
        { from: "a", to: "b" }, // parallel → summed weight to b
        { from: "a", to: "c" },
      ],
    });
    expect(scores.get("b") as number).toBeGreaterThan(scores.get("c") as number);
    expect(sum(scores)).toBeCloseTo(1, 6);
  });

  it("dedupes duplicate node entries and still sums to ~1", () => {
    const scores = pageRank({
      nodes: ["a", "a", "b"], // "a" listed twice
      edges: [{ from: "a", to: "b" }],
    });
    expect(scores.size).toBe(2);
    expect(sum(scores)).toBeCloseTo(1, 6);
    for (const v of scores.values()) expect(Number.isNaN(v)).toBe(false);
  });

  it("dangling-node graph does not produce NaN and still sums to ~1", () => {
    // every node is dangling (no out-edges)
    const scores = pageRank({ nodes: ["x", "y", "z"], edges: [] });
    for (const v of scores.values()) expect(Number.isNaN(v)).toBe(false);
    expect(sum(scores)).toBeCloseTo(1, 6);

    // a mixed graph with a real dangling target
    const mixed = pageRank({
      nodes: ["p", "q", "r"],
      edges: [
        { from: "p", to: "q" },
        { from: "q", to: "r" }, // r is dangling
      ],
    });
    for (const v of mixed.values()) expect(Number.isNaN(v)).toBe(false);
    expect(sum(mixed)).toBeCloseTo(1, 6);
  });
});

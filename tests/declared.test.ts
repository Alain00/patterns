import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { findBoundaryViolations, loadBoundaries } from "../src/detect/declared";
import type { FileGraph } from "../src/scanner/types";

/** Minimal FileGraph from an import adjacency map (importEdges drive the check). */
function graph(importEdges: Record<string, string[]>): FileGraph {
  const m = new Map<string, Set<string>>();
  for (const [f, tos] of Object.entries(importEdges)) m.set(f, new Set(tos));
  return { files: Object.keys(importEdges), importEdges: m, tags: new Map() };
}

describe("findBoundaryViolations", () => {
  it("flags a forbidden from→to edge and ignores allowed ones", () => {
    const g = graph({
      "packages/ai/agent.ts": ["packages/db/drizzle/schema.ts", "packages/queries/users.ts"],
      "packages/queries/users.ts": ["packages/db/drizzle/schema.ts"],
    });
    const out = findBoundaryViolations(g, [
      { from: "packages/ai/**", to: "packages/db/**", why: "ai must route the DB through queries/" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("boundary-violation");
    expect(out[0]!.confidence).toBe(1);
    expect(out[0]!.files).toEqual(["packages/ai/agent.ts", "packages/db/drizzle/schema.ts"]);
    // queries → db is NOT forbidden (only ai → db is); ai → queries is allowed too.
  });

  it("treats * as a single-segment wildcard (no slash)", () => {
    const g = graph({ "src/a.ts": ["lib/x.ts"], "src/deep/b.ts": ["lib/x.ts"] });
    const out = findBoundaryViolations(g, [{ from: "src/*", to: "lib/**", why: "x" }]);
    expect(out.map((v) => v.files[0])).toEqual(["src/a.ts"]); // "src/*" excludes src/deep/b.ts
  });

  it("returns [] with no rules (empty-test protection)", () => {
    expect(findBoundaryViolations(graph({ "a.ts": ["b.ts"] }), [])).toEqual([]);
  });
});

describe("loadBoundaries", () => {
  it("reads the boundaries block from a patterns.yaml (file or dir)", () => {
    const dir = mkdtempSync(join(tmpdir(), "bnd-"));
    writeFileSync(
      join(dir, "patterns.yaml"),
      [
        "name: x",
        "version: 0.1.0",
        "description: d",
        "boundaries:",
        '  - from: "packages/ai/**"',
        '    to: "packages/db/**"',
        '    why: "route via queries"',
      ].join("\n"),
    );
    const rules = loadBoundaries(dir); // a directory → looks for patterns.yaml inside
    expect(rules).toEqual([{ from: "packages/ai/**", to: "packages/db/**", why: "route via queries" }]);
    expect(loadBoundaries(join(dir, "patterns.yaml"))).toEqual(rules); // a file path works too
  });

  it("returns [] when the file or boundaries block is absent", () => {
    expect(loadBoundaries("/no/such/path/patterns.yaml")).toEqual([]);
  });
});

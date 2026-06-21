import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { buildGraph } from "../src/scanner/graph";

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "patterns-graph-"));
  // a imports b (relative, extensionless) and calls a name b defines.
  writeFileSync(
    join(dir, "a.ts"),
    `import { Greeter } from "./b";\nconst g = new Greeter();\ngreet();\n`,
  );
  // b defines the class + function a references.
  writeFileSync(
    join(dir, "b.ts"),
    `export class Greeter {}\nexport function greet() { return "hi"; }\n`,
  );
  // c is unrelated.
  writeFileSync(join(dir, "c.ts"), `export const unrelated = 42;\n`);
  return dir;
}

describe("buildGraph", () => {
  it("nodes only supported files, a->b edge, populated tags", async () => {
    const dir = fixture();
    const graph = await buildGraph(dir, ["a.ts", "b.ts", "c.ts", "README.md"]);

    // README.md is unsupported -> dropped from the node set.
    expect(graph.files.sort()).toEqual(["a.ts", "b.ts", "c.ts"]);

    // a -> b via the import and/or the def/ref name edge.
    expect(graph.edges.get("a.ts")?.has("b.ts")).toBe(true);

    // c is unrelated: no outgoing edges, and nobody points at it.
    expect(graph.edges.get("c.ts") ?? new Set()).toEqual(new Set());
    for (const set of graph.edges.values()) expect(set.has("c.ts")).toBe(false);

    // tags populated for every node.
    expect(graph.tags.size).toBe(3);
    const bDefs = graph.tags.get("b.ts")!.defs.map((d) => d.name);
    expect(bDefs).toContain("Greeter");
    expect(bDefs).toContain("greet");
    expect(graph.tags.get("a.ts")!.imports).toContain("./b");
  });

  it("skips bare/package imports", async () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-graph-bare-"));
    writeFileSync(join(dir, "x.ts"), `import { Injectable } from "@nestjs/common";\n`);
    const graph = await buildGraph(dir, ["x.ts"]);
    expect(graph.edges.get("x.ts") ?? new Set()).toEqual(new Set());
  });
});

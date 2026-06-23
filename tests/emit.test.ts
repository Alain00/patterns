import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { emitBundle } from "../src/emit/bundle";
import { parseManifest } from "../src/core/parse";
import type { PatternManifest } from "../src/core/schema";

const MANIFEST: PatternManifest = {
  name: "hex",
  version: "0.1.0",
  description: "ports and adapters",
  scope: "internal",
  stack: ["node"],
  structure: [{ path: "structure/domain.md", is: "pure rules" }],
  rules: [],
  recipes: [],
  adrs: [],
  boundaries: [],
};

describe("emit", () => {
  it("scaffolds, serializes patterns.yaml, and validates clean when docs exist", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "emit-")), "hex");
    mkdirSync(join(dir, "structure"), { recursive: true });
    writeFileSync(join(dir, "structure/domain.md"), "# domain");
    // the agent authors the prose (README + AGENTS) before calling emit
    writeFileSync(join(dir, "README.md"), "# hex");
    writeFileSync(join(dir, "AGENTS.md"), "# hex — for agents");

    const issues = emitBundle(MANIFEST, dir);
    expect(issues).toHaveLength(0);
    expect(existsSync(join(dir, "patterns.yaml"))).toBe(true);
    expect(parseManifest(dir).manifest.name).toBe("hex");
  });

  it("flags a rich-index file that the agent has not written yet", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "emit-")), "hex");
    const issues = emitBundle(MANIFEST, dir); // structure/domain.md NOT written
    expect(issues.some((i) => i.message.includes("structure/domain.md"))).toBe(true);
  });
});

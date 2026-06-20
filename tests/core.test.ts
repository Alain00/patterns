import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { parseManifest } from "../src/core/parse";
import { validatePattern } from "../src/core/validate";

function bundle(manifest: string, files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "patterns-"));
  writeFileSync(join(dir, "patterns.yaml"), manifest);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

const MANIFEST = `
name: hexagonal-node
version: 0.1.0
description: ports-and-adapters for a node service
stack: [node]
structure:
  - path: structure/domain.md
    is: pure business rules, no IO
`;

describe("core", () => {
  it("parses a valid patterns.yaml", () => {
    const dir = bundle(MANIFEST, { "structure/domain.md": "# domain" });
    const pattern = parseManifest(dir);
    expect(pattern.manifest.name).toBe("hexagonal-node");
    expect(pattern.manifest.structure[0]?.is).toContain("business rules");
  });

  it("flags a rich-index entry whose file is missing (drift)", () => {
    const dir = bundle(MANIFEST); // structure/domain.md NOT written
    const issues = validatePattern(parseManifest(dir));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("structure/domain.md");
  });
});

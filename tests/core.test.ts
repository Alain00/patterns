import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { parseArch } from "../src/core/parse.js";
import { validatePattern } from "../src/core/validate.js";

function bundle(arch: string, files: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "patterns-"));
  writeFileSync(join(dir, "arch.yaml"), arch);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

const ARCH = `
name: hexagonal-node
version: 0.1.0
description: ports-and-adapters for a node service
stack: [node]
structure:
  - path: structure/domain.md
    is: pure business rules, no IO
`;

describe("core", () => {
  it("parses a valid arch.yaml", () => {
    const dir = bundle(ARCH, { "structure/domain.md": "# domain" });
    const pattern = parseArch(dir);
    expect(pattern.arch.name).toBe("hexagonal-node");
    expect(pattern.arch.structure[0]?.is).toContain("business rules");
  });

  it("flags a rich-index entry whose file is missing (drift)", () => {
    const dir = bundle(ARCH); // structure/domain.md NOT written
    const issues = validatePattern(parseArch(dir));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("structure/domain.md");
  });
});

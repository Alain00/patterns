import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { parseManifest, serializeManifest } from "../src/core/parse";
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
    expect(issues.some((i) => i.message.includes("structure/domain.md"))).toBe(true);
  });

  it("rejects a rich-index path that points at a directory, not a file", () => {
    const dir = bundle(MANIFEST);
    mkdirSync(join(dir, "structure", "domain.md"), { recursive: true }); // a DIR where a doc is expected
    const issues = validatePattern(parseManifest(dir));
    expect(issues.some((i) => i.message.includes("structure/domain.md") && i.message.includes("directory"))).toBe(true);
  });

  it("defaults scope to internal and parses an explicit shareable scope", () => {
    const internal = bundle(MANIFEST, { "structure/domain.md": "# domain" });
    expect(parseManifest(internal).manifest.scope).toBe("internal");

    const shareable = bundle(MANIFEST.replace("stack: [node]", "scope: shareable\nstack: [node]"), {
      "structure/domain.md": "# domain",
    });
    expect(parseManifest(shareable).manifest.scope).toBe("shareable");
  });

  it("rejects an unknown scope value", () => {
    const dir = bundle(MANIFEST.replace("stack: [node]", "scope: public\nstack: [node]"));
    expect(() => parseManifest(dir)).toThrow(/scope/);
  });

  it("serializes scope back to patterns.yaml (round-trip)", () => {
    const dir = bundle(MANIFEST, { "structure/domain.md": "# domain" });
    const pattern = parseManifest(dir);
    pattern.manifest.scope = "shareable";
    serializeManifest(pattern);
    expect(parseManifest(dir).manifest.scope).toBe("shareable");
  });

  it("rejects a rich-index path that escapes its section / the bundle", () => {
    const escape = `
name: evil
version: 0.1.0
description: tries to reference outside the bundle
stack: []
structure:
  - path: ../outside.md
    is: not in the bundle
`;
    const dir = bundle(escape);
    writeFileSync(join(dir, "..", "outside.md"), "# gotcha"); // exists, but outside the bundle
    const issues = validatePattern(parseManifest(dir));
    expect(issues.some((i) => i.message.includes("../outside.md") && i.message.includes("must"))).toBe(true);
  });
});

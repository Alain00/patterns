import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { listFiles } from "../src/scanner/inventory";

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "ign-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

describe("inventory ignore rules", () => {
  it("always skips framework build dirs (.next) and applies .gitignore segment names (leading / is cosmetic)", () => {
    const dir = project({
      ".gitignore": "/generated/\n",
      "src/app.ts": "export const x = 1;",
      ".next/static/chunk.js": "/* build output */",
      "generated/types.ts": "export type T = 1;",
    });
    const files = listFiles(dir);
    expect(files).toContain("src/app.ts");
    expect(files.some((f) => f.startsWith(".next/"))).toBe(false); // ALWAYS_SKIP
    expect(files.some((f) => f.startsWith("generated/"))).toBe(false); // "/generated/" → segment "generated" ignored (leading / cosmetic)
  });
});

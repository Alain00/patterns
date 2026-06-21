import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { detectStack } from "../src/scanner/stack";

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "patterns-stack-"));
  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

describe("detectStack", () => {
  it("maps nest deps + tsconfig to a stable framework-first order", () => {
    const dir = project({
      "package.json": JSON.stringify({
        dependencies: { "@nestjs/common": "^10", "@nestjs/core": "^10" },
        devDependencies: { typescript: "^5" },
      }),
      "nest-cli.json": "{}",
    });
    const stack = detectStack(dir);
    expect(stack).toEqual(["nestjs", "typescript"]);
  });

  it("returns [] for an empty dir (no package.json)", () => {
    expect(detectStack(project({}))).toEqual([]);
  });

  it("dedupes the same tag from a dep and a config marker", () => {
    const dir = project({
      "package.json": JSON.stringify({ dependencies: { next: "^14", react: "^18" } }),
      "next.config.mjs": "export default {};",
    });
    const stack = detectStack(dir);
    expect(stack).toEqual(["nextjs", "react"]); // "nextjs" once, not twice
  });

  it("maps libs: prisma, mongoose→mongodb, pg→postgres", () => {
    const dir = project({
      "package.json": JSON.stringify({
        dependencies: { "@prisma/client": "^5", mongoose: "^8", pg: "^8" },
      }),
    });
    expect(detectStack(dir)).toEqual(["prisma", "mongodb", "postgres"]);
  });

  it("infers typescript from tsconfig.json alone", () => {
    const dir = project({
      "package.json": JSON.stringify({ dependencies: { express: "^4" } }),
      "tsconfig.json": "{}",
    });
    expect(detectStack(dir)).toEqual(["express", "typescript"]);
  });

  it("returns [] for a malformed package.json", () => {
    expect(detectStack(project({ "package.json": "{ not json" }))).toEqual([]);
  });
});

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { buildGraph } from "../src/scanner/graph";
import { listFiles } from "../src/scanner/inventory";

function project(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "alias-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

describe("graph tsconfig aliases", () => {
  it("resolves @/* and baseUrl-relative imports into import edges", async () => {
    const dir = project({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"] } },
      }),
      "src/a.ts": `import { b } from "@/b";\nimport { c } from "src/c";\nexport const a = 1;`,
      "src/b.ts": "export const b = 2;",
      "src/c.ts": "export const c = 3;",
    });
    const g = await buildGraph(dir, listFiles(dir));
    const imports = g.importEdges?.get("src/a.ts") ?? new Set<string>();
    expect(imports.has("src/b.ts")).toBe(true); // via "@/*" → "src/*" alias
    expect(imports.has("src/c.ts")).toBe(true); // via baseUrl-relative bare import
  });

  it("keeps aliases when a tsconfig string value contains '//' (parseJsonc regression)", async () => {
    // A "//"-containing value must not trip the JSONC comment stripper: valid JSON is
    // parsed as-is, so the alias still resolves (the old stripper dropped ALL aliases).
    const dir = project({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["src/*"], note: ["see//here"] } },
      }),
      "src/a.ts": `import { b } from "@/b";\nexport const a = 1;`,
      "src/b.ts": "export const b = 2;",
    });
    const g = await buildGraph(dir, listFiles(dir));
    const imports = g.importEdges.get("src/a.ts") ?? new Set<string>();
    expect(imports.has("src/b.ts")).toBe(true);
  });

  it("resolves monorepo workspace package imports (@repo/ui + subpath)", async () => {
    const dir = project({
      "package.json": JSON.stringify({ name: "root", private: true, workspaces: ["apps/*", "packages/*"] }),
      "packages/ui/package.json": JSON.stringify({
        name: "@repo/ui",
        exports: { ".": "./src/index.ts", "./button": "./src/button.ts" },
      }),
      "packages/ui/src/index.ts": "export const ui = 1;",
      "packages/ui/src/button.ts": "export const Button = () => null;",
      "apps/web/package.json": JSON.stringify({ name: "web", dependencies: { "@repo/ui": "workspace:*" } }),
      "apps/web/app.ts": `import { ui } from "@repo/ui";\nimport { Button } from "@repo/ui/button";\nexport const app = ui;`,
    });
    const g = await buildGraph(dir, listFiles(dir));
    const imports = g.importEdges?.get("apps/web/app.ts") ?? new Set<string>();
    expect(imports.has("packages/ui/src/index.ts")).toBe(true); // "@repo/ui" → exports["."]
    expect(imports.has("packages/ui/src/button.ts")).toBe(true); // "@repo/ui/button" → subpath
  });
});

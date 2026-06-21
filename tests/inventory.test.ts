import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { detectConventions, inventory, listFiles } from "../src/scanner/inventory";

/** Build a temp project tree with nested folders + a .gitignore. */
function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "patterns-inv-"));
  mkdirSync(join(dir, "src", "orders"), { recursive: true });
  mkdirSync(join(dir, "src", "users"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "left-pad"), { recursive: true });
  mkdirSync(join(dir, "generated"), { recursive: true });

  writeFileSync(join(dir, "README.md"), "# proj");
  writeFileSync(join(dir, "package.json"), "{}");
  writeFileSync(join(dir, ".gitignore"), "generated/\n*.log\n");
  writeFileSync(join(dir, "src", "orders", "orders.service.ts"), "");
  writeFileSync(join(dir, "src", "orders", "orders.controller.ts"), "");
  writeFileSync(join(dir, "src", "users", "users.service.ts"), "");
  writeFileSync(join(dir, "debug.log"), "noise"); // ignored by *.log
  writeFileSync(join(dir, "node_modules", "left-pad", "index.js"), ""); // always skipped
  writeFileSync(join(dir, "generated", "schema.ts"), ""); // gitignored dir
  return dir;
}

describe("inventory", () => {
  it("listFiles excludes node_modules, gitignored dir, and *.log; sorted POSIX", () => {
    const files = listFiles(project());
    expect(files).toEqual([
      ".gitignore",
      "README.md",
      "package.json",
      "src/orders/orders.controller.ts",
      "src/orders/orders.service.ts",
      "src/users/users.service.ts",
    ]);
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.some((f) => f.startsWith("generated/"))).toBe(false);
    expect(files).not.toContain("debug.log");
  });

  it("inventory root fileCount counts direct files only; children sorted", () => {
    const root = inventory(project());
    expect(root.path).toBe("");
    expect(root.fileCount).toBe(3); // .gitignore, README.md, package.json (debug.log ignored)
    expect(root.children.map((c) => c.path)).toEqual(["src"]); // node_modules + generated skipped

    const src = root.children[0]!;
    expect(src.fileCount).toBe(0);
    expect(src.children.map((c) => c.path)).toEqual(["src/orders", "src/users"]);
    expect(src.children[0]!.fileCount).toBe(2); // orders.service.ts + orders.controller.ts
  });

  it("detectConventions surfaces suffix/dir/ext signals sorted by count", () => {
    const conv = detectConventions(listFiles(project()));
    const service = conv.find((c) => c.signal === "suffix:service");
    expect(service).toBeDefined();
    expect(service!.count).toBe(2);
    expect(service!.examples.length).toBeLessThanOrEqual(3);

    expect(conv.find((c) => c.signal === "dir:src")!.count).toBe(3);
    expect(conv.find((c) => c.signal === "ext:.ts")!.count).toBe(3);
    // sorted desc by count
    for (let i = 1; i < conv.length; i++) {
      expect(conv[i - 1]!.count).toBeGreaterThanOrEqual(conv[i]!.count);
    }
  });
});

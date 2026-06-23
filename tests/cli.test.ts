import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import { parse as parseYaml } from "yaml";

const BIN = fileURLToPath(new URL("../bin/patterns.ts", import.meta.url));

/** Run the CLI as a real subprocess so these are true end-to-end tests of the binary. */
function run(args: string[], opts: { stdin?: string; cwd?: string; env?: Record<string, string> } = {}) {
  const res = spawnSync(process.execPath, [BIN, ...args], {
    input: opts.stdin ?? "",
    cwd: opts.cwd,
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
    encoding: "utf8",
  });
  return { stdout: res.stdout ?? "", stderr: res.stderr ?? "", code: res.status ?? 0 };
}

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("patterns init", () => {
  it("creates a bundle named after the directory (plain name)", () => {
    const dir = tmp("cli-init-");
    const r = run(["init", "mybundle"], { cwd: dir });
    expect(r.code).toBe(0);
    const manifest = parseYaml(readFileSync(join(dir, "mybundle", "patterns.yaml"), "utf8"));
    expect(manifest.name).toBe("mybundle");
  });

  it("honors an absolute path and names the manifest by basename (not the full path)", () => {
    const base = tmp("cli-init-abs-");
    const target = join(base, "deep", "abs-bundle");
    const r = run(["init", target]);
    expect(r.code).toBe(0);
    expect(existsSync(join(target, "patterns.yaml"))).toBe(true);
    const manifest = parseYaml(readFileSync(join(target, "patterns.yaml"), "utf8"));
    expect(manifest.name).toBe("abs-bundle");
  });

  it("exits 1 when <name> is missing", () => {
    expect(run(["init"]).code).toBe(1);
  });
});

describe("patterns emit", () => {
  const valid = JSON.stringify({ name: "p", version: "0.1.0", description: "a demo" });

  it("rejects an invalid manifest with a readable message, not a raw ZodError", () => {
    const dir = tmp("cli-emit-bad-");
    const r = run(["emit", join(dir, "out")], { stdin: '{"name":"x"}' });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("invalid manifest");
    expect(r.stderr).not.toContain("ZodError");
    expect(r.stderr).not.toContain("[");
  });

  it("rejects non-JSON stdin with a readable message", () => {
    const r = run(["emit", tmp("cli-emit-nojson-")], { stdin: "not json" });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("not valid JSON");
  });

  it("writes patterns.yaml but reports the missing prose until README/AGENTS exist", () => {
    const out = join(tmp("cli-emit-ok-"), "p");
    const r1 = run(["emit", out], { stdin: valid });
    expect(r1.code).toBe(1); // README.md / AGENTS.md not authored yet (by design)
    expect(existsSync(join(out, "patterns.yaml"))).toBe(true);

    writeFileSync(join(out, "README.md"), "# p\n");
    writeFileSync(join(out, "AGENTS.md"), "# p\n");
    const r2 = run(["emit", out], { stdin: valid });
    expect(r2.code).toBe(0);
    expect(r2.stdout).toContain("p@0.1.0");
  });

  it("tags the bundle scope and warns that an internal pattern is not publishable", () => {
    const out = join(tmp("cli-emit-scope-"), "p");
    run(["emit", out], { stdin: valid }); // scaffold patterns.yaml (internal by default)
    writeFileSync(join(out, "README.md"), "# p\n");
    writeFileSync(join(out, "AGENTS.md"), "# p\n");
    const r = run(["emit", out], { stdin: valid });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("(internal)");
    expect(r.stdout).toMatch(/internal scope/);
  });

  it("emits a shareable-scope bundle without the internal warning", () => {
    const out = join(tmp("cli-emit-share-"), "p");
    const shareable = JSON.stringify({ name: "p", version: "0.1.0", description: "a demo", scope: "shareable" });
    run(["emit", out], { stdin: shareable });
    writeFileSync(join(out, "README.md"), "# p\n");
    writeFileSync(join(out, "AGENTS.md"), "# p\n");
    const r = run(["emit", out], { stdin: shareable });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("(shareable)");
    expect(r.stdout).not.toMatch(/internal scope/);
  });
});

describe("patterns validate", () => {
  it("gives a friendly error on a non-bundle path (not a raw ENOENT)", () => {
    const r = run(["validate", tmp("cli-val-")]); // empty dir, no patterns.yaml
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("not a pattern bundle");
    expect(r.stderr).not.toContain("ENOENT");
  });
});

describe("patterns scan / detect", () => {
  function fixture(): string {
    const dir = tmp("cli-scan-");
    writeFileSync(join(dir, "a.ts"), `import { b } from "./b";\nexport const a = b;\n`);
    writeFileSync(join(dir, "b.ts"), `export const b = 1;\n`);
    return dir;
  }

  it("scan emits a structure-map JSON with the expected keys", () => {
    const r = run(["scan", fixture()]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j).toHaveProperty("rankedFiles");
    expect(j).toHaveProperty("dirTree");
    expect(j).toHaveProperty("conventions");
    expect(j).toHaveProperty("stack");
  });

  it("detect emits a reflexion-diff JSON with the expected keys", () => {
    const r = run(["detect", fixture()]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.stdout);
    expect(j).toHaveProperty("intended");
    expect(j).toHaveProperty("convergences");
    expect(j).toHaveProperty("divergences");
    expect(j).toHaveProperty("absences");
  });
});

describe("v2 commands and dispatch", () => {
  it("find queries the catalog and fails cleanly when it's unreachable", () => {
    // Point at an unreachable host so the catalog client errors deterministically (no network).
    const r = run(["find", "foo"], { env: { PATTERNS_API_URL: "http://127.0.0.1:9" } });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/could not reach catalog|no catalog available/);
  });

  it("update with nothing installed is a no-op and does NOT write a router AGENTS.md", () => {
    const dir = tmp("cli-update-");
    const r = run(["update"], { cwd: dir });
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("no patterns installed");
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false); // never clobbers when there's nothing to do
  });

  it("publish outside a git repo fails cleanly", () => {
    const r = run(["publish"], { cwd: tmp("cli-pub-") });
    expect(r.code).toBe(1);
    expect(r.stderr.length).toBeGreaterThan(0);
  });

  it("refuses to publish an internal-scope pattern, and --force bypasses the guard", () => {
    function bundleDir(scope: string): string {
      const dir = tmp("cli-pub-scope-");
      writeFileSync(
        join(dir, "patterns.yaml"),
        `name: housey\nversion: 0.1.0\ndescription: demo\nscope: ${scope}\nstack: []\n`,
      );
      writeFileSync(join(dir, "README.md"), "# housey\n");
      writeFileSync(join(dir, "AGENTS.md"), "# housey\n");
      return dir;
    }

    // internal → blocked by the local guard, before any git/network work.
    const blocked = run(["publish"], { cwd: bundleDir("internal") });
    expect(blocked.code).toBe(1);
    expect(blocked.stderr).toContain("internal-scope");

    // --force skips the scope guard; it then fails later (no git origin), NOT on scope.
    const forced = run(["publish", "--force"], { cwd: bundleDir("internal") });
    expect(forced.code).toBe(1);
    expect(forced.stderr).not.toContain("internal-scope");

    // positive control: a shareable bundle passes the guard (then fails on git, not scope).
    const shared = run(["publish"], { cwd: bundleDir("shareable") });
    expect(shared.code).toBe(1);
    expect(shared.stderr).not.toContain("internal-scope");
  });

  it("an unknown command exits 1 with usage", () => {
    const r = run(["bogus"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("unknown command");
  });

  it("a command missing its required arg exits 1", () => {
    expect(run(["add"]).code).toBe(1);
  });
});

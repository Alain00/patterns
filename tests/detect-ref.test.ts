import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { detectRef, parseOriginUrl } from "../src/registry/detect-ref";

describe("parseOriginUrl", () => {
  it("parses every common remote form to owner/repo", () => {
    const cases: [string, string][] = [
      ["git@github.com:acme/widgets.git", "acme/widgets"],
      ["https://github.com/acme/widgets.git", "acme/widgets"],
      ["https://github.com/acme/widgets", "acme/widgets"],
      ["ssh://git@github.com/acme/widgets.git", "acme/widgets"],
      ["https://github.com/acme/widgets/", "acme/widgets"],
    ];
    for (const [url, expected] of cases) expect(parseOriginUrl(url)).toBe(expected);
  });
});

describe("detectRef", () => {
  let repo: string;

  async function initRepo(origin: string): Promise<void> {
    await $`git -C ${repo} init -q`.quiet();
    await $`git -C ${repo} remote add origin ${origin}`.quiet();
  }

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "patterns-detect-"));
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it("infers owner/repo when patterns.yaml is at the repo root", async () => {
    await initRepo("git@github.com:acme/widgets.git");
    writeFileSync(join(repo, "patterns.yaml"), "name: x\n");
    expect(await detectRef(repo)).toBe("acme/widgets");
  });

  it("includes the sub-path when patterns.yaml lives in a subdirectory", async () => {
    await initRepo("https://github.com/acme/widgets.git");
    const sub = join(repo, "patterns", "web");
    mkdirSync(sub, { recursive: true });
    writeFileSync(join(sub, "patterns.yaml"), "name: x\n");
    expect(await detectRef(sub)).toBe("acme/widgets/patterns/web");
  });

  it("throws when there is no patterns.yaml", async () => {
    await initRepo("git@github.com:acme/widgets.git");
    await expect(detectRef(repo)).rejects.toThrow(/no patterns\.yaml/);
  });

  it("throws when there is no origin remote", async () => {
    await $`git -C ${repo} init -q`.quiet();
    writeFileSync(join(repo, "patterns.yaml"), "name: x\n");
    await expect(detectRef(repo)).rejects.toThrow(/origin/);
  });

  it("throws when not in a git repo", async () => {
    const bare = mkdtempSync(join(tmpdir(), "patterns-nogit-"));
    try {
      await expect(detectRef(bare)).rejects.toThrow(/not inside a git repository/);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

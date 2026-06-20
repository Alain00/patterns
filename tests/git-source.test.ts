import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { parseRef } from "../src/registry/git-source";

describe("parseRef", () => {
  it("defaults the host to github and bundle to repo root", () => {
    expect(parseRef("vercel-labs/hexagonal")).toEqual({
      kind: "git",
      host: "github.com",
      owner: "vercel-labs",
      repo: "hexagonal",
      subdir: "",
      gitRef: undefined,
    });
  });

  it("captures a subdir", () => {
    const r = parseRef("acme/patterns/node/hexagonal");
    expect(r).toMatchObject({ kind: "git", repo: "patterns", subdir: "node/hexagonal" });
  });

  it("pins a git ref after #", () => {
    expect(parseRef("acme/patterns#v1.2.0")).toMatchObject({ subdir: "", gitRef: "v1.2.0" });
    expect(parseRef("acme/patterns/sub#main")).toMatchObject({ subdir: "sub", gitRef: "main" });
  });

  it("recognizes a non-github host", () => {
    expect(parseRef("gitlab.com/acme/patterns")).toMatchObject({ host: "gitlab.com", owner: "acme" });
  });

  it("treats an existing directory as local", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-ref-"));
    expect(parseRef(dir)).toEqual({ kind: "local", dir });
  });

  it("rejects a ref without owner/repo", () => {
    expect(() => parseRef("just-a-name")).toThrow(/invalid pattern ref/);
  });
});

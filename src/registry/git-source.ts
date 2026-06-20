import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { $ } from "bun";
import type { PatternSource } from "./source";
import { MANIFEST_FILE, parseManifest } from "../core/parse";
import type { Pattern } from "../core/schema";

/**
 * A reference resolved to either a local directory or a remote git repo.
 *
 *   ./local/dir            existing local path → used directly
 *   owner/repo             github.com/owner/repo @ default branch, bundle at root
 *   owner/repo/sub/dir     bundle lives in a subdirectory
 *   owner/repo#v1.2.0      pin a branch, tag, or commit
 *   gitlab.com/owner/repo  non-github host (first segment containing a "." is the host)
 */
export type ParsedRef =
  | { kind: "local"; dir: string }
  | {
      kind: "git";
      host: string;
      owner: string;
      repo: string;
      subdir: string;
      gitRef?: string;
    };

const DEFAULT_HOST = "github.com";

/** Pure ref parser (no IO except the local-existence check). Exported for tests. */
export function parseRef(ref: string): ParsedRef {
  const trimmed = ref.trim();
  if (!trimmed) throw new Error("empty pattern ref");

  // An existing directory on disk wins — enables `add ./my-pattern` for local authoring.
  const asPath = resolvePath(trimmed);
  if (existsSync(asPath)) return { kind: "local", dir: asPath };

  const [locator, gitRef] = splitOnce(trimmed, "#");
  const segments = locator.split("/").filter(Boolean);

  // Leading segment with a dot is a host (github.com, gitlab.com, ...).
  const host = segments[0]?.includes(".") ? segments.shift()! : DEFAULT_HOST;
  const [owner, repo, ...rest] = segments;

  if (!owner || !repo) {
    throw new Error(
      `invalid pattern ref "${ref}" — expected owner/repo[/subdir][#ref] or a local path`,
    );
  }

  return { kind: "git", host, owner, repo, subdir: rest.join("/"), gitRef };
}

/** Git-native resolution (ADR-0001): patterns live in git repos, no backend. */
export class GitSource implements PatternSource {
  async resolve(ref: string): Promise<Pattern> {
    const parsed = parseRef(ref);
    if (parsed.kind === "local") return parseManifest(parsed.dir);

    const dest = mkdtempSync(join(tmpdir(), "patterns-clone-"));
    const url = `https://${parsed.host}/${parsed.owner}/${parsed.repo}.git`;
    await clone(url, parsed.gitRef, dest);

    // Drop git metadata so it is never copied into .patterns/ on materialize.
    rmSync(join(dest, ".git"), { recursive: true, force: true });

    const bundleDir = parsed.subdir ? join(dest, parsed.subdir) : dest;
    if (!existsSync(join(bundleDir, MANIFEST_FILE))) {
      throw new Error(
        `no ${MANIFEST_FILE} found at ${parsed.owner}/${parsed.repo}${parsed.subdir ? "/" + parsed.subdir : ""}`,
      );
    }
    return parseManifest(bundleDir);
  }
}

/**
 * Shallow-clone the repo. When a ref is given we first try `--branch` (fast path
 * for branches/tags); if that fails the ref is likely a commit SHA, so we fall
 * back to a full clone + checkout.
 */
async function clone(
  url: string,
  gitRef: string | undefined,
  dest: string,
): Promise<void> {
  try {
    const branchArgs = gitRef ? ["--branch", gitRef] : [];
    await $`git clone --depth 1 ${branchArgs} ${url} ${dest}`.quiet();
    return;
  } catch (err) {
    if (!gitRef) throw cloneError(url, err);
  }

  // Fallback path (ref is likely a commit SHA): start from a clean dir.
  rmSync(dest, { recursive: true, force: true });
  try {
    await $`git clone ${url} ${dest}`.quiet();
    await $`git -C ${dest} checkout ${gitRef}`.quiet();
  } catch (err) {
    throw cloneError(url, err);
  }
}

function cloneError(url: string, err: unknown): Error {
  const detail = err instanceof Error ? err.message : String(err);
  return new Error(`failed to fetch ${url}: ${detail}`);
}

function splitOnce(value: string, sep: string): [string, string | undefined] {
  const i = value.indexOf(sep);
  return i === -1
    ? [value, undefined]
    : [value.slice(0, i), value.slice(i + sep.length)];
}

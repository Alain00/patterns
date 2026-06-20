import { existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { $ } from "bun";
import { MANIFEST_FILE } from "../core/parse";

/**
 * Infer the publish ref (`owner/repo` or `owner/repo/sub`) from the current git
 * repo, so `patterns publish` can be run with no argument from inside a pattern.
 * Owner/repo come from the `origin` remote; the sub-path is the location of the
 * pattern's `patterns.yaml` relative to the repo root.
 */
export async function detectRef(cwd = process.cwd()): Promise<string> {
  const root = await repoRoot(cwd);
  if (!root) {
    throw new Error(
      "not inside a git repository — run from a pattern's repo or pass a ref explicitly",
    );
  }

  const origin = await originUrl(cwd);
  if (!origin) {
    throw new Error(
      `no 'origin' remote on this repo — push it to GitHub or pass a ref explicitly`,
    );
  }

  const ownerRepo = parseOriginUrl(origin);
  if (!ownerRepo) {
    throw new Error(`could not parse owner/repo from origin "${origin}" — pass a ref explicitly`);
  }

  const manifestDir = findManifestDir(cwd, root);
  if (!manifestDir) {
    throw new Error(
      `no ${MANIFEST_FILE} found in this repo — run from a pattern's directory or pass a ref explicitly`,
    );
  }

  const sub = relative(root, manifestDir).split(sep).join("/");
  return sub ? `${ownerRepo}/${sub}` : ownerRepo;
}

async function repoRoot(cwd: string): Promise<string | null> {
  try {
    const out = await $`git -C ${cwd} rev-parse --show-toplevel`.quiet().text();
    return out.trim() || null;
  } catch {
    return null;
  }
}

async function originUrl(cwd: string): Promise<string | null> {
  try {
    const out = await $`git -C ${cwd} remote get-url origin`.quiet().text();
    return out.trim() || null;
  } catch {
    return null;
  }
}

/** Extract `owner/repo` from any common remote URL form (https, ssh, scp-style). */
export function parseOriginUrl(url: string): string | null {
  const match = url.trim().replace(/\/+$/, "").match(/([^/:]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

/** Walk up from cwd to the repo root looking for the directory that holds patterns.yaml. */
function findManifestDir(cwd: string, root: string): string | null {
  let dir = cwd;
  while (true) {
    if (existsSync(join(dir, MANIFEST_FILE))) return dir;
    if (dir === root) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Client-side mirror of patterns.directory's `src/lib/ref.ts`, so `publish`
 * can reject a malformed ref with a friendly local message before hitting the
 * network. Shapes accepted: `owner/repo` or `owner/repo/sub/path`.
 */
export interface ParsedRef {
  owner: string;
  repo: string;
  /** Sub-path within the repo where patterns.yaml lives, or "" for the root. */
  sub: string;
  /** Normalized ref string (no trailing slash, no `.git`). */
  ref: string;
}

const SEGMENT = /^[A-Za-z0-9._-]+$/;

export function parseRef(input: string): ParsedRef | null {
  const cleaned = input.trim().replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  if (!cleaned) return null;

  const parts = cleaned.split("/");
  if (parts.length < 2) return null;
  if (!parts.every((p) => SEGMENT.test(p))) return null;

  const [owner, repo, ...rest] = parts;
  const sub = rest.join("/");
  const ref = sub ? `${owner}/${repo}/${sub}` : `${owner}/${repo}`;
  return { owner: owner!, repo: repo!, sub, ref };
}

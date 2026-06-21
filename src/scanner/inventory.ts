/**
 * Static project walk for Fase 1 (`scan`) — folder tree, flat file list, and
 * majority-rule conventions. Deterministic, no LLM.
 *
 * Walk skips node_modules/.git/dist/build/coverage/.patterns always, plus a
 * best-effort .gitignore at the project root via a simple line-based matcher.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Convention, FolderNode } from "./types";

/**
 * Fail loudly when the target is not a directory. The walkers swallow readdir
 * errors (returning []) so a missing path or a file-as-path would otherwise look
 * like a valid empty project; callers must be able to tell those apart.
 */
export function assertProjectDir(dir: string): void {
  let isDir = false;
  try {
    isDir = statSync(dir).isDirectory();
  } catch {
    throw new Error(`not a directory: ${dir}`);
  }
  if (!isDir) throw new Error(`not a directory: ${dir}`);
}

const ALWAYS_SKIP = new Set([
  "node_modules",
  ".git",
  ".patterns",
  // build / framework output — never part of the architecture, only noise.
  "dist",
  "build",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".output",
  ".turbo",
  ".cache",
  ".vercel",
  ".expo",
]);

const TEST_DIRS = new Set(["tests", "test", "__tests__", "e2e", "__mocks__"]);

/**
 * Whether a file is a test/spec (by `.test.`/`.spec.` suffix or a test directory).
 * `scan` keeps these in the map; `detect` excludes them — they are not architecture.
 */
export function isTestFile(path: string, extraDirs?: Iterable<string>): boolean {
  const parts = path.split("/");
  const base = parts[parts.length - 1] ?? path;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(base)) return true;
  const dirs = extraDirs
    ? new Set([...TEST_DIRS, ...[...extraDirs].map((d) => d.toLowerCase())])
    : TEST_DIRS;
  return parts.slice(0, -1).some((seg) => dirs.has(seg.toLowerCase()));
}

/** Simple .gitignore matcher: bare names, trailing-slash dirs, leading "*." globs. */
interface IgnoreRules {
  names: Set<string>; // bare name or trailing-slash dir → match any segment
  extGlobs: Set<string>; // "*.log" → ".log" suffix match on basenames
}

function loadIgnore(projectDir: string): IgnoreRules {
  const names = new Set<string>();
  const extGlobs = new Set<string>();
  let raw = "";
  try {
    raw = readFileSync(join(projectDir, ".gitignore"), "utf8");
  } catch {
    return { names, extGlobs };
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    // Strip git anchoring/dir markers so "/.next/" and "coverage/" match the segment name.
    const cleaned = trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
    if (cleaned.startsWith("*.")) {
      extGlobs.add(cleaned.slice(1)); // "*.log" → ".log"
    } else if (cleaned) {
      names.add(cleaned);
    }
  }
  return { names, extGlobs };
}

function isIgnored(name: string, rules: IgnoreRules): boolean {
  if (rules.names.has(name)) return true;
  for (const ext of rules.extGlobs) if (name.endsWith(ext)) return true;
  return false;
}

/** To POSIX-separated relative path. */
function posix(rel: string): string {
  return sep === "/" ? rel : rel.split(sep).join("/");
}

/**
 * Walk the project tree and build a folder map. Root has path "" and
 * fileCount = files directly inside (not recursive); children sorted by path.
 */
export function inventory(projectDir: string, opts: { skip?: Iterable<string> } = {}): FolderNode {
  const rules = loadIgnore(projectDir);
  const extra = new Set(opts.skip ?? []);

  function walk(absDir: string, relPath: string): FolderNode {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      entries = [];
    }
    let fileCount = 0;
    const children: FolderNode[] = [];
    for (const entry of entries) {
      const name = entry.name;
      if (entry.isDirectory()) {
        if (ALWAYS_SKIP.has(name) || extra.has(name) || isIgnored(name, rules)) continue;
        const childRel = relPath ? `${relPath}/${name}` : name;
        children.push(walk(join(absDir, name), childRel));
      } else if (entry.isFile()) {
        if (isIgnored(name, rules)) continue;
        fileCount++;
      }
    }
    children.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    return { path: relPath, fileCount, children };
  }

  return walk(projectDir, "");
}

/**
 * Flat list of all non-ignored file paths, relative to projectDir, POSIX
 * separators, sorted.
 */
export function listFiles(projectDir: string, opts: { skip?: Iterable<string> } = {}): string[] {
  const rules = loadIgnore(projectDir);
  const extra = new Set(opts.skip ?? []);
  const out: string[] = [];

  function walk(absDir: string): void {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const name = entry.name;
      const abs = join(absDir, name);
      if (entry.isDirectory()) {
        if (ALWAYS_SKIP.has(name) || extra.has(name) || isIgnored(name, rules)) continue;
        walk(abs);
      } else if (entry.isFile()) {
        if (isIgnored(name, rules)) continue;
        out.push(posix(relative(projectDir, abs)));
      }
    }
  }

  walk(projectDir);
  out.sort();
  return out;
}

/** Bump a signal's count and keep up to 3 example paths. */
function bump(
  map: Map<string, { count: number; examples: string[] }>,
  signal: string,
  example: string,
): void {
  let entry = map.get(signal);
  if (!entry) {
    entry = { count: 0, examples: [] };
    map.set(signal, entry);
  }
  entry.count++;
  if (entry.examples.length < 3) entry.examples.push(example);
}

/**
 * Majority-rule signals from a file list: filename suffix before the final
 * extension, directory segment names, and an extension census. Sorted desc by count.
 */
export function detectConventions(files: string[]): Convention[] {
  const signals = new Map<string, { count: number; examples: string[] }>();

  for (const file of files) {
    const segments = file.split("/");
    const base = segments[segments.length - 1] ?? file;

    // dir: each directory segment (everything but the basename).
    for (let i = 0; i < segments.length - 1; i++) {
      bump(signals, `dir:${segments[i]}`, file);
    }

    // ext: final extension, including the dot.
    const dot = base.lastIndexOf(".");
    if (dot > 0) {
      const ext = base.slice(dot); // ".ts"
      bump(signals, `ext:${ext}`, file);

      // suffix: token before the final extension, e.g. "orders.service.ts" → "service".
      const stem = base.slice(0, dot); // "orders.service"
      const prevDot = stem.lastIndexOf(".");
      if (prevDot > 0) {
        bump(signals, `suffix:${stem.slice(prevDot + 1)}`, file);
      }
    }
  }

  return Array.from(signals.entries())
    .map(([signal, { count, examples }]) => ({ signal, count, examples }))
    .sort((a, b) =>
      b.count - a.count || (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0),
    );
}

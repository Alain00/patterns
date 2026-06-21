/**
 * Build the directed file→file import graph for Fase 1 (`scan`) — LLM-free.
 *
 * Edges come from resolved imports only: a RELATIVE/aliased/workspace import source is
 * resolved against the node set and forms a `from → to` edge. (Name-ref "Aider-style"
 * edges were removed — no consumer used them; the detectors and PageRank both rank over
 * imports, and name-refs only inflated leaf-utility hubs and false cycles.)
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { extractTags, langForFile, supportedExtensions } from "./lang";
import type { FileGraph, FileTags } from "./types";

// Candidate suffixes for resolving an extensionless import to a node. Derived from
// the parser's supported extensions so it never drifts from lang.ts (e.g. an import
// resolving to a .mts/.cjs file still forms an edge): "", every bare ext, every
// "/index.<ext>".
const SUPPORTED_EXTS = supportedExtensions();
const RESOLVE_SUFFIXES = ["", ...SUPPORTED_EXTS, ...SUPPORTED_EXTS.map((e) => `/index${e}`)];

/** Normalize a path to forward slashes so it matches the (relative) node set. */
function toPosix(p: string): string {
  return normalize(p).split("\\").join("/");
}

/** A "*"-split of a tsconfig path key or target. */
interface Glob {
  pre: string;
  post: string;
  star: boolean;
}

/** tsconfig path mapping, normalized to projectDir-relative space. */
interface Aliases {
  baseUrl: string; // projectDir-relative ("" === project root)
  hasBaseUrl: boolean;
  paths: Array<Glob & { targets: Glob[] }>;
}

const NO_ALIASES: Aliases = { baseUrl: "", hasBaseUrl: false, paths: [] };

function splitStar(s: string): Glob {
  const i = s.indexOf("*");
  return i < 0
    ? { pre: s, post: "", star: false }
    : { pre: s.slice(0, i), post: s.slice(i + 1), star: true };
}

/** Best-effort JSONC parse (strips comments + trailing commas); null on failure. */
function parseJsonc(text: string): any {
  // Most tsconfig.json files are valid JSON — try that first so a legitimate string
  // value containing "//" (e.g. a path like "src//gen") can't be corrupted by the
  // comment-stripping fallback, which would otherwise drop ALL aliases silently.
  try {
    return JSON.parse(text);
  } catch {
    // not plain JSON — fall through to the JSONC strip-and-parse.
  }
  try {
    const stripped = text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'])\/\/.*$/gm, "$1")
      .replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

/** Read compilerOptions.baseUrl + paths from the project's tsconfig.json. */
function loadAliases(projectDir: string): Aliases {
  let raw: string;
  try {
    raw = readFileSync(join(projectDir, "tsconfig.json"), "utf8");
  } catch {
    return NO_ALIASES;
  }
  const co = parseJsonc(raw)?.compilerOptions;
  if (!co) return NO_ALIASES;

  const hasBaseUrl = typeof co.baseUrl === "string";
  const baseUrl = hasBaseUrl ? toPosix(co.baseUrl).replace(/^\.?\/*/, "").replace(/\/+$/, "") : "";

  const paths: Aliases["paths"] = [];
  if (co.paths && typeof co.paths === "object") {
    for (const [key, targets] of Object.entries(co.paths)) {
      if (!Array.isArray(targets)) continue;
      paths.push({
        ...splitStar(key),
        targets: (targets as unknown[]).filter((t): t is string => typeof t === "string").map(splitStar),
      });
    }
  }
  return { baseUrl, hasBaseUrl, paths };
}

/** Join a projectDir-relative base with a relative path. */
function underBase(baseUrl: string, rel: string): string {
  return toPosix(baseUrl ? `${baseUrl}/${rel}` : rel);
}

function tryResolve(relPath: string, nodes: Set<string>): string | null {
  for (const suffix of RESOLVE_SUFFIXES) {
    const candidate = toPosix(relPath + suffix);
    if (nodes.has(candidate)) return candidate;
  }
  return null;
}

/** A workspace package discovered from a package.json `name` (monorepo). */
interface WorkspacePkg {
  dir: string; // projectDir-relative package root ("" === repo root)
  pkg: any; // parsed package.json
}

/** Collect string entry targets from a package.json `exports` value (flattens condition objects). */
function exportTargets(value: unknown, out: string[]): void {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) exportTargets(v, out);
  }
}

/** Map every workspace package `name` → its dir, from the package.json files already walked. */
function loadWorkspaces(projectDir: string, files: string[]): Map<string, WorkspacePkg> {
  const map = new Map<string, WorkspacePkg>();
  for (const rel of files) {
    if (rel !== "package.json" && !rel.endsWith("/package.json")) continue;
    let pkg: any;
    try {
      pkg = JSON.parse(readFileSync(join(projectDir, rel), "utf8"));
    } catch {
      continue;
    }
    if (typeof pkg?.name !== "string" || !pkg.name) continue;
    const dir = rel === "package.json" ? "" : rel.slice(0, -"/package.json".length);
    map.set(pkg.name, { dir, pkg });
  }
  return map;
}

/** Resolve a package's entry module: exports["."]/module/main/types, then src/index fallbacks. */
function resolveEntry(p: WorkspacePkg, nodes: Set<string>): string | null {
  const candidates: string[] = [];
  const ex = p.pkg.exports;
  exportTargets(ex && typeof ex === "object" && "." in ex ? ex["."] : ex, candidates);
  for (const field of ["module", "main", "types", "typings"]) {
    if (typeof p.pkg[field] === "string") candidates.push(p.pkg[field]);
  }
  for (const c of candidates) {
    const r = tryResolve(underBase(p.dir, c.replace(/^\.\//, "")), nodes);
    if (r) return r;
  }
  return tryResolve(underBase(p.dir, "src/index"), nodes) ?? tryResolve(underBase(p.dir, "index"), nodes);
}

/** Resolve a workspace import like "@repo/ui" or "@repo/ui/button" to a node. */
function resolveWorkspace(
  source: string,
  packages: Map<string, WorkspacePkg>,
  nodes: Set<string>,
): string | null {
  // Exact package import — direct lookup, no scan.
  const exact = packages.get(source);
  if (exact) return resolveEntry(exact, nodes);

  // Subpath import ("@scope/pkg/sub" or "pkg/sub"): an npm package name is at most
  // "@scope/pkg" (one slash) or "pkg" (none), so the package prefix is fixed-length —
  // derive it and look it up directly instead of scanning every package (O(1) per import).
  const slash = source.indexOf("/");
  if (slash < 0) return null;
  let pkgName: string;
  let sub: string;
  if (source.startsWith("@")) {
    const second = source.indexOf("/", slash + 1);
    if (second < 0) return null; // "@scope" with no package part
    pkgName = source.slice(0, second);
    sub = source.slice(second + 1);
  } else {
    pkgName = source.slice(0, slash);
    sub = source.slice(slash + 1);
  }
  const p = packages.get(pkgName);
  if (!p) return null;
  return tryResolve(underBase(p.dir, sub), nodes) ?? tryResolve(underBase(p.dir, `src/${sub}`), nodes);
}

/**
 * Resolve an import `source` from `fromFile` to a member of `nodes`: relative imports
 * against the importer's dir, then tsconfig path aliases (`@/*`), then workspace
 * packages (`@repo/ui` in a monorepo), then baseUrl-relative bare imports. Bare
 * package imports that match nothing return null.
 */
function resolveImport(
  fromFile: string,
  source: string,
  nodes: Set<string>,
  aliases: Aliases,
  packages: Map<string, WorkspacePkg>,
): string | null {
  // 1. relative
  if (source.startsWith(".")) {
    return tryResolve(toPosix(join(dirname(fromFile), source)), nodes);
  }
  // 2. tsconfig path aliases
  for (const p of aliases.paths) {
    let filled: string[] | null = null;
    if (p.star) {
      if (
        source.length >= p.pre.length + p.post.length &&
        source.startsWith(p.pre) &&
        source.endsWith(p.post)
      ) {
        const wildcard = source.slice(p.pre.length, source.length - p.post.length);
        filled = p.targets.map((t) => (t.star ? `${t.pre}${wildcard}${t.post}` : `${t.pre}${t.post}`));
      }
    } else if (source === p.pre) {
      filled = p.targets.map((t) => `${t.pre}${t.post}`);
    }
    for (const cand of filled ?? []) {
      const r = tryResolve(underBase(aliases.baseUrl, cand), nodes);
      if (r) return r;
    }
  }
  // 3. workspace packages (monorepo: "@repo/ui", "@repo/ui/button")
  const ws = resolveWorkspace(source, packages, nodes);
  if (ws) return ws;
  // 4. baseUrl-relative bare import (e.g. "src/foo" with baseUrl ".")
  if (aliases.hasBaseUrl) {
    const r = tryResolve(underBase(aliases.baseUrl, source), nodes);
    if (r) return r;
  }
  return null;
}

/** Read content and extract tags for every supported file. */
export async function buildGraph(projectDir: string, files: string[]): Promise<FileGraph> {
  const supported = files.filter((f) => langForFile(f) !== null);
  const nodeSet = new Set(supported);
  const aliases = loadAliases(projectDir);
  const packages = loadWorkspaces(projectDir, files);

  const tags = new Map<string, FileTags>();
  for (const file of supported) {
    const lang = langForFile(file)!;
    const code = await readFile(join(projectDir, file), "utf8");
    tags.set(file, await extractTags(code, lang));
  }

  // The directed import graph: resolved imports only.
  const importEdges = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (from === to) return;
    let set = importEdges.get(from);
    if (!set) importEdges.set(from, (set = new Set()));
    set.add(to);
  };

  for (const file of supported) {
    for (const source of tags.get(file)!.imports) {
      const resolved = resolveImport(file, source, nodeSet, aliases, packages);
      if (resolved) add(file, resolved);
    }
  }

  return { files: supported, importEdges, tags };
}

/**
 * Build the directed file→file graph for Fase 1 (`scan`) — LLM-free.
 *
 * Two edge sources, both deterministic:
 *  (1) IMPORT edges — resolve RELATIVE import sources against the importer's dir.
 *  (2) DEF/REF NAME edges (Aider-style) — a file that *refs* a name another file
 *      *defs* gets an edge to that defining file.
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
  for (const [name, p] of packages) {
    if (source === name) return resolveEntry(p, nodes);
    if (source.startsWith(`${name}/`)) {
      const sub = source.slice(name.length + 1);
      return tryResolve(underBase(p.dir, sub), nodes) ?? tryResolve(underBase(p.dir, `src/${sub}`), nodes);
    }
  }
  return null;
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

  // defname -> files that define it (for the name-ref edges).
  const defOwners = new Map<string, Set<string>>();
  for (const file of supported) {
    for (const def of tags.get(file)!.defs) {
      let owners = defOwners.get(def.name);
      if (!owners) defOwners.set(def.name, (owners = new Set()));
      owners.add(file);
    }
  }

  // Two graphs with distinct provenance: importEdges (resolved imports only) drives
  // the architectural detectors; edges (imports ∪ name-refs) drives PageRank ranking.
  const edges = new Map<string, Set<string>>();
  const importEdges = new Map<string, Set<string>>();
  const add = (map: Map<string, Set<string>>, from: string, to: string) => {
    if (from === to) return;
    let set = map.get(from);
    if (!set) map.set(from, (set = new Set()));
    set.add(to);
  };

  for (const file of supported) {
    const ft = tags.get(file)!;
    // (1) import edges → both graphs.
    for (const source of ft.imports) {
      const resolved = resolveImport(file, source, nodeSet, aliases, packages);
      if (resolved) {
        add(importEdges, file, resolved);
        add(edges, file, resolved);
      }
    }
    // (2) def/ref name edges → ranking graph only (too noisy for cycle/layer analysis).
    for (const ref of ft.refs) {
      const owners = defOwners.get(ref.name);
      if (!owners) continue;
      for (const owner of owners) {
        if (owner !== file) add(edges, file, owner);
      }
    }
  }

  return { files: supported, edges, importEdges, tags };
}

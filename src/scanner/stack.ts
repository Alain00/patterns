/**
 * Stack detector for Fase 1 (`scan`) — deterministic, LLM-free.
 *
 * Reads package.json deps + a few config markers and maps them to stable, deduped
 * stack tags. No network, no parsing beyond JSON. Order is fixed: frameworks first,
 * then language, then libraries — so the output is reproducible across runs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** dep name (or prefix with trailing `*`) → stack tag. */
const DEP_RULES: Array<{ match: string; tag: string }> = [
  // frameworks
  { match: "@nestjs/*", tag: "nestjs" },
  { match: "next", tag: "nextjs" },
  { match: "react", tag: "react" },
  { match: "express", tag: "express" },
  { match: "fastify", tag: "fastify" },
  // language
  { match: "typescript", tag: "typescript" },
  // libs
  { match: "@prisma/client", tag: "prisma" },
  { match: "prisma", tag: "prisma" },
  { match: "mongoose", tag: "mongodb" },
  { match: "pg", tag: "postgres" },
];

/** config file (relative to projectDir) → stack tag. */
const CONFIG_RULES: Array<{ file: string; tag: string }> = [
  { file: "nest-cli.json", tag: "nestjs" },
  { file: "next.config.js", tag: "nextjs" },
  { file: "next.config.ts", tag: "nextjs" },
  { file: "next.config.mjs", tag: "nextjs" },
  { file: "tsconfig.json", tag: "typescript" },
];

/** Stable emit order: frameworks, then language, then libs. */
const ORDER = ["nestjs", "nextjs", "react", "express", "fastify", "typescript", "prisma", "mongodb", "postgres"];

function matchesDep(dep: string, rule: string): boolean {
  if (rule.endsWith("*")) return dep.startsWith(rule.slice(0, -1));
  return dep === rule;
}

function readDeps(projectDir: string): string[] {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  } catch {
    return []; // malformed package.json → no signal
  }
}

/**
 * Detect the stack of the project at `projectDir` from package.json deps + config
 * markers. Returns deduped tags in a stable order. No package.json and no markers → [].
 */
export function detectStack(projectDir: string): string[] {
  const tags = new Set<string>();

  for (const dep of readDeps(projectDir)) {
    for (const rule of DEP_RULES) {
      if (matchesDep(dep, rule.match)) tags.add(rule.tag);
    }
  }

  for (const rule of CONFIG_RULES) {
    if (existsSync(join(projectDir, rule.file))) tags.add(rule.tag);
  }

  return ORDER.filter((tag) => tags.has(tag));
}

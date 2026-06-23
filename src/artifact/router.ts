import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  AGENT_FILES,
  CONSUME_SKILL,
  INSTALL_DIR,
  MARKER_END,
  MARKER_START,
  SKILL_INSTALL_DIR,
} from "../core/bundle";
import { listInstalled, type InstalledPattern } from "../registry/installed";
import { installConsumeSkill } from "./skill";

/** Cursor needs frontmatter to know when to apply a rule; we own this file, so we set it. */
const CURSOR_FRONTMATTER = [
  "---",
  "description: Architecture patterns installed in this repo — follow them before placing code",
  "alwaysApply: true",
  "---",
  "",
  "",
].join("\n");

/**
 * Build the managed block: NOT the architecture itself, but a router that tells the
 * agent WHEN to act (before placing code), points it at the consume skill, and lists
 * each installed pattern's patterns.yaml — the agent's first read (progressive
 * disclosure). The same block is written into every agent-instruction file.
 */
function buildBlock(installed: InstalledPattern[]): string {
  const skillPath = `${SKILL_INSTALL_DIR}/${CONSUME_SKILL}/SKILL.md`;
  const patterns = installed.length
    ? installed.map(
        (p) => `- **${p.name}** — ${p.manifest.description}\n  Index: \`${INSTALL_DIR}/${p.name}/patterns.yaml\``,
      )
    : ["- (none yet — add one with `patterns add <ref>`)"];

  return [
    MARKER_START,
    "# Project patterns",
    "",
    "This project uses architecture patterns installed by `patterns`. Before you place or",
    "write code in an area an installed pattern covers, follow that pattern:",
    "",
    `1. Read the relevant \`${INSTALL_DIR}/<name>/patterns.yaml\` first — a small, structured`,
    "   index of what exists, where code goes, and the import boundaries.",
    "2. Open only the `structure/`, `rules/`, or `recipes/` doc your task needs",
    "   (progressive disclosure) — don't read the whole bundle.",
    "3. Place code where the pattern says and respect its `boundaries` (forbidden imports).",
    `   Never hand-edit files under \`${INSTALL_DIR}/\` — refresh them with \`patterns update\`.`,
    "",
    `Full protocol: \`${skillPath}\`.`,
    "",
    "Installed patterns:",
    ...patterns,
    MARKER_END,
  ].join("\n");
}

/**
 * (Re)write the managed block in `file`, always converging to exactly one clean block
 * while never deleting content outside it:
 *
 * - a well-formed block (START then a following END) → replace only that span; content
 *   before and after is preserved verbatim;
 * - a file with no markers → append the block (existing content kept);
 * - a missing/empty file → create it (with `createPrefix`, e.g. Cursor frontmatter);
 * - an orphan START (no END after it — a truncated/merge-mangled block) → reclaim from
 *   the START to EOF and re-close it, so we self-heal to one block instead of appending
 *   a duplicate (which a later run could splice across, eating user content).
 *
 * The END is matched *after* the START (`indexOf(MARKER_END, start)`), so a stray END
 * sitting before our block is never paired with it. Parent directories are created.
 */
function upsertManagedBlock(file: string, block: string, createPrefix: string): void {
  let existing = "";
  try {
    existing = readFileSync(file, "utf8");
  } catch {
    existing = "";
  }

  const start = existing.indexOf(MARKER_START);
  const end = start === -1 ? -1 : existing.indexOf(MARKER_END, start);
  let next: string;
  if (start !== -1 && end !== -1) {
    next = existing.slice(0, start) + block + existing.slice(end + MARKER_END.length);
  } else if (start !== -1) {
    console.error(`⚠ ${file}: repaired a malformed patterns block (missing end marker)`);
    next = existing.slice(0, start) + block;
  } else if (existing.trim()) {
    next = `${existing.replace(/\n*$/, "")}\n\n${block}`;
  } else {
    next = createPrefix + block;
  }

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${next.replace(/\n*$/, "")}\n`, "utf8");
}

/**
 * (Re)write the router block into every agent-instruction file (AGENTS.md, CLAUDE.md,
 * Cursor rule, Copilot instructions). Idempotent and driven off listInstalled, so it
 * self-heals on every add/update/remove rather than appending duplicates. Returns the
 * relative paths written.
 */
export function writeRouter(projectDir: string): string[] {
  const block = buildBlock(listInstalled(projectDir));
  const written: string[] = [];
  for (const rel of AGENT_FILES) {
    upsertManagedBlock(join(projectDir, rel), block, rel.endsWith(".mdc") ? CURSOR_FRONTMATTER : "");
    written.push(rel);
  }
  return written;
}

/**
 * The full agent-integration step: install the consume skill and (re)write the router
 * block across all formats. Run by add/update/remove (so a repo's integration stays in
 * sync with what's installed) and by the `sync` command / skill.sh on its own.
 */
export function syncAgents(projectDir: string): { skill: string | null; files: string[] } {
  const skill = installConsumeSkill(projectDir);
  const files = writeRouter(projectDir);
  return { skill, files };
}

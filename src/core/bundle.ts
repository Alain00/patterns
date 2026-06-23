/**
 * The pattern bundle model — the unit on disk.
 *
 *   <name>/
 *   ├── patterns.yaml  only structured file; identity + rich index
 *   ├── README.md      for humans: what it is, trade-offs, how to use
 *   ├── AGENTS.md      for agents: how to use/extend this pattern
 *   ├── structure/     describe
 *   ├── rules/         restrict
 *   ├── recipes/       action
 *   └── adrs/          justify
 */

export const BUNDLE_DIRS = ["structure", "rules", "recipes", "adrs"] as const;
export const BUNDLE_FILES = ["patterns.yaml", "README.md", "AGENTS.md"] as const;

/** Where installed patterns live inside a target project. */
export const INSTALL_DIR = ".patterns";

/** Sidecar inside an installed bundle recording the ref it was installed from (for `update`). */
export const ORIGIN_FILE = ".origin";

/** The agent's entry point, written at the target project root. */
export const ROUTER_FILE = "AGENTS.md";

/**
 * Markers delimiting the managed block we (re)write inside every agent-instruction
 * file. Idempotent: only the content between them is rewritten; anything a human put
 * outside the markers is always preserved. HTML comments so they render invisibly.
 */
export const MARKER_START = "<!-- patterns:start -->";
export const MARKER_END = "<!-- patterns:end -->";

/**
 * The agent skill that teaches an agent how to FOLLOW installed patterns (the consume
 * side). It ships with this tool under `skills/<CONSUME_SKILL>/` and is copied into a
 * target repo on install. Generic and domain-agnostic — one skill for every pattern.
 */
export const CONSUME_SKILL = "consume";

/** Where the consume skill is installed in a target repo (Claude Code project skills). */
export const SKILL_INSTALL_DIR = ".claude/skills";

/**
 * Agent-instruction files we keep a managed block in, so every common agent harness
 * gets the "read the pattern first" pointer in the format it auto-discovers. Each is
 * upserted idempotently and create-if-missing; content outside the markers is kept.
 * ROUTER_FILE (AGENTS.md) is first — the canonical, tool-agnostic entry point.
 */
export const AGENT_FILES = [
  ROUTER_FILE,
  "CLAUDE.md",
  ".cursor/rules/patterns.mdc",
  ".github/copilot-instructions.md",
] as const;

export type BundleDir = (typeof BUNDLE_DIRS)[number];

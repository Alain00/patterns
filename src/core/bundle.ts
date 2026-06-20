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

/** The agent's entry point, written at the target project root. */
export const ROUTER_FILE = "AGENTS.md";

export type BundleDir = (typeof BUNDLE_DIRS)[number];

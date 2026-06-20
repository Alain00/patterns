import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR, ROUTER_FILE } from "../core/bundle.js";
import { listInstalled } from "../registry/installed.js";

const MARKER_START = "<!-- patterns:start -->";
const MARKER_END = "<!-- patterns:end -->";

/**
 * (Re)write the root AGENTS.md router. The router does NOT contain the
 * architecture — it points the agent at each installed pattern's patterns.yaml,
 * which is the agent's first read (progressive disclosure).
 */
export function writeRouter(projectDir: string): void {
  const installed = listInstalled(projectDir);

  const lines = [
    MARKER_START,
    "# Project patterns",
    "",
    "This project uses architecture patterns installed by `patterns`.",
    "Read the relevant `patterns.yaml` FIRST to learn where code goes before writing any.",
    "",
    ...installed.map(
      (p) => `- **${p.name}** — ${p.manifest.description}\n  Index: \`${INSTALL_DIR}/${p.name}/patterns.yaml\``,
    ),
    MARKER_END,
  ];

  // TODO(v1): splice between markers when AGENTS.md already has other content.
  writeFileSync(join(projectDir, ROUTER_FILE), lines.join("\n") + "\n", "utf8");
}

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INSTALL_DIR, ROUTER_FILE } from "../core/bundle";
import { listInstalled } from "../registry/installed";

const MARKER_START = "<!-- patterns:start -->";
const MARKER_END = "<!-- patterns:end -->";

/**
 * (Re)write the root AGENTS.md router. The router does NOT contain the
 * architecture — it points the agent at each installed pattern's patterns.yaml,
 * which is the agent's first read (progressive disclosure).
 *
 * Only the managed block between the markers is rewritten: hand-edited content
 * before/after the markers is preserved, and an existing AGENTS.md with no markers
 * gets the block appended rather than clobbered.
 */
export function writeRouter(projectDir: string): void {
  const installed = listInstalled(projectDir);

  const block = [
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
  ].join("\n");

  const file = join(projectDir, ROUTER_FILE);
  let existing = "";
  try {
    existing = readFileSync(file, "utf8");
  } catch {
    existing = "";
  }

  const start = existing.indexOf(MARKER_START);
  const end = existing.indexOf(MARKER_END);
  let next: string;
  if (start !== -1 && end !== -1 && end > start) {
    next = existing.slice(0, start) + block + existing.slice(end + MARKER_END.length);
  } else if (existing.trim()) {
    next = `${existing.replace(/\n*$/, "")}\n\n${block}`;
  } else {
    next = block;
  }

  writeFileSync(file, `${next.replace(/\n*$/, "")}\n`, "utf8");
}

import { syncAgents } from "../artifact/router";
import { listInstalled } from "../registry/installed";

/**
 * (Re)install the consume skill and (re)write the agent-instruction blocks for this
 * repo, in every supported format (.claude/skills + AGENTS.md/CLAUDE.md/Cursor/Copilot).
 *
 * This is the same agent-integration step `add`/`update`/`remove` run, exposed on its
 * own (and driven by skill.sh) so a repo can be wired — or re-wired after a manual edit
 * — without installing a new pattern. Idempotent.
 */
export function sync(dir?: string): void {
  const cwd = dir ?? process.cwd();
  const { skill, files } = syncAgents(cwd);
  const count = listInstalled(cwd).length;
  if (skill) console.log(`consume skill → ${skill}`);
  console.log(
    `wired ${files.length} agent file(s)` +
      (count ? `; ${count} pattern(s) referenced` : " (no patterns installed yet)"),
  );
}

import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { AGENT_FILES, INSTALL_DIR, MARKER_END, MARKER_START } from "../src/core/bundle";
import { syncAgents, writeRouter } from "../src/artifact/router";
import { installConsumeSkill } from "../src/artifact/skill";
import { remove } from "../src/cli/remove";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "artifact-"));
}

/** Drop a minimal valid installed bundle under .patterns/<name>/ so listInstalled sees it. */
function installFakePattern(projectDir: string, name: string, description: string): void {
  const dir = join(projectDir, INSTALL_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "patterns.yaml"),
    `name: ${name}\nversion: 0.1.0\ndescription: ${description}\nscope: internal\nstack: []\n`,
  );
}

const startCount = (s: string) => s.split(MARKER_START).length - 1;

describe("writeRouter — multi-format agent files", () => {
  it("writes the managed block into every agent file, referencing the consume skill", () => {
    const dir = tmp();
    const written = writeRouter(dir);

    expect(written).toEqual([...AGENT_FILES]);
    for (const rel of AGENT_FILES) {
      const body = readFileSync(join(dir, rel), "utf8");
      expect(body).toContain(MARKER_START);
      expect(body).toContain(MARKER_END);
      expect(body).toContain("# Project patterns");
      expect(body).toContain(".claude/skills/consume/SKILL.md"); // points at the skill
    }
  });

  it("gives the Cursor rule frontmatter (alwaysApply) and others none", () => {
    const dir = tmp();
    writeRouter(dir);
    const mdc = readFileSync(join(dir, ".cursor/rules/patterns.mdc"), "utf8");
    expect(mdc.startsWith("---\n")).toBe(true);
    expect(mdc).toContain("alwaysApply: true");
    // a plain agent file has no frontmatter — it opens straight into the marker block
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8").startsWith(MARKER_START)).toBe(true);
  });

  it("lists installed patterns; says 'none yet' when empty", () => {
    const dir = tmp();
    writeRouter(dir);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toContain("none yet");

    installFakePattern(dir, "demo", "a demo pattern");
    writeRouter(dir);
    const body = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(body).toContain("**demo** — a demo pattern");
    expect(body).toContain(`${INSTALL_DIR}/demo/patterns.yaml`);
    expect(body).not.toContain("none yet");
  });

  it("is idempotent — re-running never duplicates the block", () => {
    const dir = tmp();
    writeRouter(dir);
    writeRouter(dir);
    writeRouter(dir);
    for (const rel of AGENT_FILES) {
      expect(startCount(readFileSync(join(dir, rel), "utf8"))).toBe(1);
    }
  });

  it("preserves hand-edited content outside the markers, and replaces only the inner block", () => {
    const dir = tmp();
    writeFileSync(join(dir, "CLAUDE.md"), "# Mine\n\nKeep me.\n");
    writeRouter(dir);

    let body = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    expect(body).toContain("Keep me."); // appended, not clobbered
    expect(body).toContain(MARKER_START);

    // a second run with a pattern present updates only the block; hand content stays once
    installFakePattern(dir, "demo", "a demo pattern");
    writeRouter(dir);
    body = readFileSync(join(dir, "CLAUDE.md"), "utf8");
    expect(body.split("Keep me.").length - 1).toBe(1);
    expect(startCount(body)).toBe(1);
    expect(body).toContain("**demo**");
  });

  it("preserves a human footer AFTER the block (block in the middle of the file)", () => {
    const dir = tmp();
    writeRouter(dir); // AGENTS.md = block only
    const file = join(dir, "AGENTS.md");
    writeFileSync(file, `${readFileSync(file, "utf8").trimEnd()}\n\n## My footer\nkeep my footer\n`);

    writeRouter(dir); // re-sync: must keep the footer after MARKER_END, exactly once
    const body = readFileSync(file, "utf8");
    expect(body.split("keep my footer").length - 1).toBe(1);
    expect(body.indexOf("keep my footer")).toBeGreaterThan(body.indexOf(MARKER_END));
    expect(startCount(body)).toBe(1);
  });

  it("self-heals a malformed block (orphan START, no END) to a single clean block", () => {
    const dir = tmp();
    const file = join(dir, "AGENTS.md");
    // an unclosed managed region with a human heading before it
    writeFileSync(file, "# Mine\n\n<!-- patterns:start -->\nstale half-block\n");

    writeRouter(dir);
    writeRouter(dir); // two ordinary syncs (as add/update/remove would do)
    const body = readFileSync(file, "utf8");
    expect(startCount(body)).toBe(1); // never duplicated
    expect(body.split(MARKER_END).length - 1).toBe(1); // exactly one end marker
    expect(body).toContain("# Mine"); // content BEFORE the orphan marker survives
    expect(body).toContain("# Project patterns");
  });

  it("keeps the Cursor frontmatter exactly once across re-syncs", () => {
    const dir = tmp();
    writeRouter(dir);
    writeRouter(dir);
    writeRouter(dir);
    const mdc = readFileSync(join(dir, ".cursor/rules/patterns.mdc"), "utf8");
    expect(mdc.startsWith("---\n")).toBe(true);
    expect(mdc.split("alwaysApply: true").length - 1).toBe(1); // not re-prepended on re-sync
    expect(startCount(mdc)).toBe(1);
  });
});

describe("installConsumeSkill", () => {
  it("copies the shipped consume skill into .claude/skills/consume/", () => {
    const dir = tmp();
    const dest = installConsumeSkill(dir);
    expect(dest).not.toBeNull();
    expect(existsSync(join(dir, ".claude/skills/consume/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, ".claude/skills/consume/BUNDLE.md"))).toBe(true);
    // the installed skill is the auto-invocable consume skill (no user-only gate)
    const skill = readFileSync(join(dir, ".claude/skills/consume/SKILL.md"), "utf8");
    expect(skill).toContain("name: consume");
    expect(skill).not.toContain("disable-model-invocation");
  });
});

describe("syncAgents", () => {
  it("installs the skill and wires every agent file in one call", () => {
    const dir = tmp();
    const { skill, files } = syncAgents(dir);
    expect(skill).not.toBeNull();
    expect(files).toEqual([...AGENT_FILES]);
    expect(existsSync(join(dir, ".claude/skills/consume/SKILL.md"))).toBe(true);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
  });

  it("wires skill + block + the freshly-installed pattern together (the post-add state)", () => {
    const dir = tmp();
    installFakePattern(dir, "demo", "a demo pattern"); // stands in for materialize()
    const { skill } = syncAgents(dir);
    expect(skill).not.toBeNull();
    expect(existsSync(join(dir, ".claude/skills/consume/SKILL.md"))).toBe(true);
    for (const rel of AGENT_FILES) {
      const body = readFileSync(join(dir, rel), "utf8");
      expect(body).toContain("# Project patterns");
      expect(body).toContain("**demo**");
    }
  });
});

describe("remove → re-wires the agent files", () => {
  it("drops the removed pattern, flips back to 'none yet', deletes the bundle, keeps the skill", () => {
    const dir = tmp();
    installFakePattern(dir, "demo", "a demo pattern");
    syncAgents(dir);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toContain("**demo**");

    remove("demo", dir);

    const body = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(body).not.toContain("**demo**");
    expect(body).toContain("none yet");
    expect(startCount(body)).toBe(1);
    expect(existsSync(join(dir, INSTALL_DIR, "demo"))).toBe(false); // bundle gone
    expect(existsSync(join(dir, ".claude/skills/consume/SKILL.md"))).toBe(true); // skill stays
  });
});

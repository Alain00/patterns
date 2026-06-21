import { GitSource } from "../registry/git-source";
import { validatePattern } from "../core/validate";
import { materialize, writeOrigin } from "../artifact/materialize";
import { writeRouter } from "../artifact/router";
import { listInstalled, type InstalledPattern } from "../registry/installed";

/**
 * Refresh installed pattern(s) by re-resolving the ref each was installed from
 * (recorded in the `.origin` sidecar by `add`) and re-materializing. With no
 * name, updates every installed pattern.
 */
export async function update(name: string | undefined, cwd = process.cwd()): Promise<void> {
  const installed = listInstalled(cwd);
  const targets = name ? installed.filter((p) => p.name === name) : installed;

  if (name && targets.length === 0) {
    throw new Error(`pattern "${name}" is not installed`);
  }
  if (targets.length === 0) {
    console.log("no patterns installed");
    return;
  }

  const source = new GitSource();
  let changed = false;

  for (const target of targets) {
    if (!target.origin) {
      console.error(`⚠ ${target.name}: no recorded origin — re-add it to enable updates`);
      continue;
    }

    let fresh;
    try {
      fresh = await source.resolve(target.origin);
    } catch (err) {
      console.error(`⚠ ${target.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const errors = validatePattern(fresh).filter((i) => i.level === "error");
    if (errors.length) {
      for (const e of errors) console.error(`✗ ${target.name}: ${e.message}`);
      console.error(`⚠ ${target.name}: skipped — resolved pattern failed validation`);
      continue;
    }

    materialize(fresh, cwd);
    writeOrigin(fresh.manifest.name, target.origin, cwd);
    changed = true;
    console.log(versionLine(target, fresh.manifest.version));
  }

  if (changed) writeRouter(cwd);
}

function versionLine(prev: InstalledPattern, nextVersion: string): string {
  return prev.version === nextVersion
    ? `${prev.name} up to date (${nextVersion})`
    : `${prev.name} ${prev.version} → ${nextVersion}`;
}

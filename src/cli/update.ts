import { GitSource } from "../registry/git-source";
import { materialize } from "../artifact/materialize";
import { writeRouter } from "../artifact/router";
import { listInstalled } from "../registry/installed";

/**
 * (v2) Refresh installed pattern(s) by re-resolving their source and
 * re-materializing. Requires recording each pattern's origin ref at install
 * time (a small addition to the installed-pattern metadata).
 */
export async function update(name: string | undefined, cwd = process.cwd()): Promise<void> {
  const targets = name ? [name] : listInstalled(cwd).map((p) => p.name);
  const source = new GitSource();
  for (const _t of targets) {
    // TODO(v2): look up origin ref for `_t`, then:
    //   const pattern = await source.resolve(ref);
    //   materialize(pattern, cwd);
    void source;
    void materialize;
  }
  writeRouter(cwd);
  throw new Error("update not implemented");
}

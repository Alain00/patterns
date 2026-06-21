/**
 * (v2) Refresh installed pattern(s) by re-resolving their source and
 * re-materializing. Not implemented yet: it requires recording each pattern's
 * origin ref at install time (a small addition to the installed-pattern metadata),
 * then per target: `GitSource.resolve(ref)` → `materialize` → `writeRouter`.
 *
 * Fails fast so the stub never mutates the project — an earlier version wrote the
 * root AGENTS.md router before throwing, which could clobber hand-edited content.
 */
export async function update(_name?: string, _cwd: string = process.cwd()): Promise<void> {
  throw new Error("update not implemented");
}

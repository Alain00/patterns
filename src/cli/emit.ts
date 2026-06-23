import { manifestSchema } from "../core/schema";
import { emitBundle } from "../emit/bundle";

/**
 * Fase 4 (`emit`) — read a manifest spec (JSON) from stdin, scaffold the bundle at
 * `dir`, write `patterns.yaml`, and validate the rich index. The `extract` agent
 * pipes the manifest it resolved in the grill; it has already written the prose
 * docs. Usage:  cat manifest.json | patterns emit ./my-pattern
 */
export async function emit(dir = process.cwd()): Promise<void> {
  // Bun.stdin.text() reads to EOF; a TTY with no pipe never sends one, so guard
  // against an interactive run hanging silently.
  if (process.stdin.isTTY) {
    throw new Error("emit reads a manifest JSON from stdin — pipe one in: cat manifest.json | patterns emit ./dir");
  }
  const raw = await Bun.stdin.text();
  if (!raw.trim()) throw new Error("emit expects a manifest JSON on stdin");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`emit: stdin is not valid JSON — ${err instanceof Error ? err.message : String(err)}`);
  }
  const result = manifestSchema.safeParse(parsed);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`emit: invalid manifest —\n${detail}`);
  }

  const manifest = result.data;
  const issues = emitBundle(manifest, dir);

  for (const i of issues) {
    console.error(`${i.level === "error" ? "✗" : "⚠"} ${i.message}`);
  }
  if (issues.some((i) => i.level === "error")) {
    process.exitCode = 1;
    return;
  }

  // Inventory of what was just written, from the in-hand manifest (no extra I/O):
  // answers "what did I produce and where?" so the author isn't left guessing
  // (plain `list` only sees installed bundles, not a freshly emitted dir).
  const counts =
    `${manifest.structure.length} structure / ${manifest.rules.length} rules / ` +
    `${manifest.recipes.length} recipes / ${manifest.adrs.length} adrs` +
    (manifest.boundaries.length ? ` / ${manifest.boundaries.length} boundaries` : "");
  console.log(`✓ ${manifest.name}@${manifest.version} (${manifest.scope}) — ${counts} → ${dir}`);

  // Remind the author that a house pattern is not publishable as-is, so they don't
  // discover the publish guard only after pushing. (shareable bundles say nothing.)
  if (manifest.scope === "internal") {
    console.log(
      "  ↳ internal scope: a house pattern (may carry business nomenclature). Generalize it (scope: shareable) before publishing.",
    );
  }
}

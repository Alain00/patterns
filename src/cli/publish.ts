import { publish } from "../registry/publish";
import { detectRef, findManifestDir } from "../registry/detect-ref";
import { parseManifest } from "../core/parse";
import { boolFlag, firstPositional, parseArgs } from "./args";

/**
 * Register a pattern in the patterns.directory Index. The ref is optional —
 * when omitted it is inferred from the current git repo (origin remote +
 * the patterns.yaml location).
 *
 * Scope guard (ADR-0009): an `internal`-scope pattern may carry business
 * nomenclature, so publishing it is refused unless `--force`.
 */
export async function publishCmd(args: string[]): Promise<void> {
  const parsed = parseArgs(args, { booleans: ["force"] });
  const ref = firstPositional(parsed);
  const force = boolFlag(parsed, "force");

  // Refuse to publish a house pattern. Only on the inferred path (no explicit ref),
  // where the local bundle IS what gets published — the ref is derived from it. With
  // an explicit ref the local cwd manifest is unrelated to what's registered, so we
  // leave that to the server (it fetches and validates the manifest from the ref).
  if (!force && !ref) {
    const bundleDir = findManifestDir(process.cwd());
    if (bundleDir) {
      try {
        const { manifest } = parseManifest(bundleDir);
        if (manifest.scope === "internal") {
          console.error(
            `✗ "${manifest.name}" is internal-scope — it may carry business nomenclature, so publishing is blocked.\n` +
              `  Generalize it to a shareable bundle (set scope: shareable in patterns.yaml), or re-run with --force.`,
          );
          process.exitCode = 1;
          return;
        }
      } catch {
        // A missing/malformed local manifest is publish/detectRef's job to surface,
        // not the guard's — fall through and let them report it.
      }
    }
  }

  let result;
  try {
    const resolvedRef = ref ?? (await detectRef());
    if (!ref) console.log(`detected ref ${resolvedRef}`);
    result = await publish(resolvedRef);
  } catch (err) {
    // Both PublishError and detectRef failures carry a user-facing message.
    if (err instanceof Error) {
      console.error(`✗ ${err.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const stack = result.stack.length ? ` [${result.stack.join(", ")}]` : "";
  console.log(`published "${result.name}" v${result.version} (${result.ref})${stack}`);
}

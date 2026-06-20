import { parseManifest } from "../core/parse";
import { validatePattern } from "../core/validate";

/** Validate a pattern bundle: schema + rich-index integrity (all referenced files exist). */
export function validate(path = process.cwd()): void {
  const pattern = parseManifest(path);
  const issues = validatePattern(pattern);

  if (!issues.length) {
    console.log(`✓ ${pattern.manifest.name} is valid`);
    return;
  }
  for (const i of issues) {
    console.error(`${i.level === "error" ? "✗" : "⚠"} ${i.message}`);
  }
  if (issues.some((i) => i.level === "error")) {
    process.exitCode = 1;
  }
}

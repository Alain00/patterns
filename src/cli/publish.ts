import { publish } from "../registry/publish";
import { detectRef } from "../registry/detect-ref";

/**
 * Register a pattern in the patterns.directory Index. The ref is optional —
 * when omitted it is inferred from the current git repo (origin remote +
 * the patterns.yaml location).
 */
export async function publishCmd(ref?: string): Promise<void> {
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

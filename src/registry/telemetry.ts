import { apiBase } from "./catalog";
import { parseRef } from "./ref";

/**
 * Install telemetry (ADR-0001): a best-effort popularity ping the CLI sends
 * after a successful `add`, so server-side ranking has install data. It is
 * strictly off the critical path — it must never fail or slow down `add`.
 *
 *   POST {apiBase}/api/installs { "ref": "owner/repo" } -> 200 { ref, installs }
 *
 * On by default; opt out with PATTERNS_TELEMETRY=0 (also: "false"/"off"/"no").
 */

const PING_TIMEOUT_MS = 2000;

export function telemetryEnabled(): boolean {
  const v = (process.env.PATTERNS_TELEMETRY ?? "").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(v);
}

function debug(message: string): void {
  if (process.env.PATTERNS_DEBUG) console.error(`[telemetry] ${message}`);
}

/**
 * Fire the install ping, swallowing every error. Awaitable so callers can bound
 * `add` on the short timeout, but a rejection here is never surfaced.
 */
export async function pingInstall(ref: string): Promise<void> {
  if (!telemetryEnabled()) {
    debug("disabled via PATTERNS_TELEMETRY");
    return;
  }
  const parsed = parseRef(ref);
  if (!parsed) {
    debug(`skipping unparseable ref "${ref}"`);
    return;
  }

  try {
    const res = await fetch(`${apiBase()}/api/installs`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ref: parsed.ref }),
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });
    // 404 = ref not indexed yet; that's an expected no-op, not a failure.
    debug(`${parsed.ref} -> ${res.status}`);
  } catch (err) {
    debug(`ping failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

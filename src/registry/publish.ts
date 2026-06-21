import { z } from "zod";
import { apiBase } from "./catalog";
import { parseRef } from "./ref";

/**
 * Publish client (ADR-0001): register a pattern in the hosted Index by ref. The
 * server never receives pattern content — it fetches the `patterns.yaml` from
 * the ref itself, validates it, and upserts a derived row. Open + rate-limited,
 * no auth, so the client sends only the ref.
 *
 *   POST {apiBase}/api/patterns { "ref": "owner/repo" | "owner/repo/sub" }
 *   -> 201 { name, ref, version, stack, installs }
 */

export interface PublishResult {
  name: string;
  ref: string;
  version: string;
  stack: string[];
  installs: number;
}

/** Raised with a user-facing message when publish is rejected (bad ref, no manifest, etc.). */
export class PublishError extends Error {}

const resultSchema = z.object({
  name: z.string(),
  ref: z.string(),
  version: z.string(),
  stack: z.array(z.string()).default([]),
  installs: z.number().default(0),
});

export async function publish(ref: string): Promise<PublishResult> {
  const parsed = parseRef(ref);
  if (!parsed) {
    throw new PublishError(`invalid ref "${ref}" — expected owner/repo or owner/repo/sub`);
  }

  const url = `${apiBase()}/api/patterns`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ ref: parsed.ref }),
    });
  } catch (err) {
    throw new PublishError(
      `could not reach ${apiBase()}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    // The server returns { error } for every failure shape (400/404/422/429/502).
    const message = await res
      .json()
      .then((b) => (b as { error?: unknown })?.error)
      .catch(() => undefined);
    throw new PublishError(
      typeof message === "string" ? message : `publish failed: ${res.status} ${res.statusText}`,
    );
  }

  return resultSchema.parse(await res.json());
}

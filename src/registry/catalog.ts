import { z } from "zod";

/**
 * Discovery client (ADR-0001): a thin client to the hosted search service at
 * patterns.directory. The CLI holds no index itself — search (fuzzy/semantic,
 * install-ranked) lives server-side, exactly like skills.sh. The `ref` each
 * result carries feeds straight back into the git-native `add`.
 *
 * The base URL is overridable via PATTERNS_API_URL (mirrors skills.sh's
 * SKILLS_API_URL) — useful for private/internal catalogs and tests.
 */

const DEFAULT_BASE = "https://patterns.directory";

export function apiBase(): string {
  return (process.env.PATTERNS_API_URL || DEFAULT_BASE).replace(/\/+$/, "");
}

export interface CatalogEntry {
  name: string;
  ref: string; // git ref to pass to `patterns add`
  description: string;
  stack: string[];
  installs?: number;
}

/** Raised when the catalog can't be reached or doesn't exist yet (vs. a genuine search failure). */
export class CatalogUnavailableError extends Error {}

// Tolerant of field naming: accept `ref` or `source`, and `data`/`patterns`/`skills` as the array key.
const entrySchema = z.object({
  name: z.string(),
  ref: z.string().optional(),
  source: z.string().optional(),
  description: z.string().default(""),
  stack: z.array(z.string()).default([]),
  installs: z.number().optional(),
});
const responseSchema = z.object({
  data: z.array(entrySchema).optional(),
  patterns: z.array(entrySchema).optional(),
  skills: z.array(entrySchema).optional(),
});

export async function search(query: string, limit = 20): Promise<CatalogEntry[]> {
  const url = `${apiBase()}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new CatalogUnavailableError(
      `could not reach catalog at ${apiBase()}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (res.status === 404) {
    throw new CatalogUnavailableError(`no catalog available yet (${url} returned 404)`);
  }
  if (!res.ok) {
    throw new Error(`catalog search failed: ${res.status} ${res.statusText}`);
  }

  const parsed = responseSchema.parse(await res.json());
  const rows = parsed.data ?? parsed.patterns ?? parsed.skills ?? [];

  return rows
    .map((r) => ({
      name: r.name,
      ref: r.ref ?? r.source ?? "",
      description: r.description,
      stack: r.stack,
      installs: r.installs,
    }))
    .filter((r) => r.ref) // a result we can't `add` is useless
    .sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0));
}

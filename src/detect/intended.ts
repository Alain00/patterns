/**
 * Infer the *intended* pattern from majority-rule conventions + stack defaults —
 * the reflexion baseline `detect` measures the real code against.
 * Deterministic, LLM-free.
 */
import type { Convention } from "../scanner/types";
import type { DominantConvention, IntendedPattern, Layering } from "./types";
import { DEFAULT_LAYER_MODEL, singularizeDir, type LayerModel } from "./layers";

/** Tunables for intended-pattern inference (defaults match the historical behaviour). */
export interface IntendedOptions {
  model?: LayerModel; // layer vocabulary (default: backend/DDD)
  dominantShare?: number; // min family share to count as dominant (default 0.2)
  dominantMinCount?: number; // min absolute count to count as dominant (default 3)
  minLayers?: number; // min distinct layers before a layering is inferred (default 2)
}

/** A signal's family — the prefix before ":" ("suffix" | "dir" | "ext"). */
function family(signal: string): string {
  const i = signal.indexOf(":");
  return i < 0 ? signal : signal.slice(0, i);
}

/** A signal's value — the part after ":" ("suffix:service" → "service"). */
function value(signal: string): string {
  const i = signal.indexOf(":");
  return i < 0 ? signal : signal.slice(i + 1);
}

/**
 * Infer the intended architecture from detected conventions + stack.
 *
 * - dominant: per-family share = count / family total; keep signals with
 *   share >= 0.2 or count >= 3, sorted desc by count then signal asc.
 * - layering: layer keywords drawn from dominant suffix:/dir: signals; built
 *   only when >= 2 distinct keywords are present, sorted ASC by layerRank.
 */
export function inferIntended(
  conventions: Convention[],
  stack: string[],
  opts: IntendedOptions = {},
): IntendedPattern {
  const model = opts.model ?? DEFAULT_LAYER_MODEL;
  const minShare = opts.dominantShare ?? 0.2;
  const minCount = opts.dominantMinCount ?? 3;
  const minLayers = opts.minLayers ?? 2;

  // family totals
  const totals = new Map<string, number>();
  for (const c of conventions) {
    const f = family(c.signal);
    totals.set(f, (totals.get(f) ?? 0) + c.count);
  }

  const dominant: DominantConvention[] = [];
  for (const c of conventions) {
    const total = totals.get(family(c.signal)) ?? c.count;
    const share = total > 0 ? c.count / total : 0;
    if (share >= minShare || c.count >= minCount) {
      dominant.push({ signal: c.signal, count: c.count, share });
    }
  }
  dominant.sort((a, b) => b.count - a.count || (a.signal < b.signal ? -1 : a.signal > b.signal ? 1 : 0));

  // layering: layer keywords from dominant suffix:/dir: signals.
  const keywords = new Set<string>();
  for (const d of dominant) {
    const f = family(d.signal);
    if (f !== "suffix" && f !== "dir") continue;
    let v = value(d.signal).toLowerCase();
    if (f === "dir") v = singularizeDir(v); // "repositories" → "repository"
    if (model.isLayerKeyword(v)) keywords.add(v);
  }

  let layering: Layering | null = null;
  if (keywords.size >= minLayers) {
    layering = { layers: Array.from(keywords).sort((a, b) => model.layerRank(a) - model.layerRank(b)) };
  }

  return { stack, dominant, layering };
}

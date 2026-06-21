/**
 * Layer vocabulary for Fase 2 (`detect`). Both the intended-pattern inference and
 * the boundary detector map files to canonical layers through a LayerModel, so layer
 * detection and violation-checking always agree. The default vocabulary is backend/DDD;
 * the agent overrides it per-repo via `detect --layers` (the backend keywords silently
 * disable all layer-aware detection on a frontend/mobile/data stack). Deterministic.
 */
import { extname } from "node:path";

/** Canonical layer order, outer (presentation) → inner (data). Index = rank. The default. */
export const CANONICAL_LAYERS: readonly (readonly string[])[] = [
  ["controller", "resolver", "gateway", "handler"],
  ["service", "usecase", "facade", "manager"],
  ["repository", "dao", "entity", "model"],
];

/**
 * Singularize a directory segment for layer matching, handling the "ies" plural so
 * "repositories" → "repository" and "entities" → "entity" (a naive /s$/ strip would
 * yield "repositorie"/"entitie" and silently lose the data layer). Lower-cases first.
 */
export function singularizeDir(segment: string): string {
  const s = segment.toLowerCase();
  return s.endsWith("ies") ? `${s.slice(0, -3)}y` : s.replace(/s$/, "");
}

/** A resolved layer vocabulary: maps files/keywords to canonical layer ranks. */
export interface LayerModel {
  groups: readonly (readonly string[])[];
  /** Rank of a layer keyword (0 = outermost), or -1 if not a known layer. */
  layerRank(keyword: string): number;
  /** Whether a keyword names a known layer. */
  isLayerKeyword(keyword: string): boolean;
  /** The canonical layer a file belongs to (filename suffix first, then a dir segment), or null. */
  fileLayer(file: string): string | null;
  /** Display name for the layer at `rank` — its first synonym. */
  nameAt(rank: number): string;
}

/** Build a LayerModel from an ordered list of synonym groups (outer→inner). */
export function makeLayerModel(groups: readonly (readonly string[])[]): LayerModel {
  const rankByKeyword = new Map<string, number>();
  groups.forEach((kws, rank) => kws.forEach((k) => rankByKeyword.set(k.toLowerCase(), rank)));

  const layerRank = (keyword: string): number => rankByKeyword.get(keyword.toLowerCase()) ?? -1;
  const isLayerKeyword = (keyword: string): boolean => rankByKeyword.has(keyword.toLowerCase());

  const fileLayer = (file: string): string | null => {
    const parts = file.split("/");
    const base = parts[parts.length - 1] ?? file;

    // suffix before the final extension: "orders.service.ts" → "service"
    const stem = base.slice(0, base.length - extname(base).length);
    const dot = stem.lastIndexOf(".");
    if (dot >= 0) {
      const suffix = stem.slice(dot + 1).toLowerCase();
      if (rankByKeyword.has(suffix)) return suffix;
    }
    // directory segments: "services" → "service", "repositories" → "repository"
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = singularizeDir(parts[i] as string);
      if (rankByKeyword.has(seg)) return seg;
    }
    return null;
  };

  const nameAt = (rank: number): string => (groups[rank]?.[0] as string) ?? `layer-${rank}`;

  return { groups, layerRank, isLayerKeyword, fileLayer, nameAt };
}

/** The default (backend/DDD) model, used when `detect --layers` is not given. */
export const DEFAULT_LAYER_MODEL: LayerModel = makeLayerModel(CANONICAL_LAYERS);

/**
 * Parse a `--layers` spec into ordered synonym groups: groups separated by "|",
 * synonyms by ",", outer→inner. e.g. "page,route|component|hook,lib".
 */
export function parseLayers(spec: string): string[][] {
  return spec
    .split("|")
    .map((g) => g.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))
    .filter((g) => g.length > 0);
}

// Default-model convenience exports — the original module API, now backed by DEFAULT_LAYER_MODEL.
export const layerRank = (keyword: string): number => DEFAULT_LAYER_MODEL.layerRank(keyword);
export const isLayerKeyword = (keyword: string): boolean => DEFAULT_LAYER_MODEL.isLayerKeyword(keyword);
export const fileLayer = (file: string): string | null => DEFAULT_LAYER_MODEL.fileLayer(file);

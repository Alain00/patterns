import type { Pattern } from "../core/schema";

/**
 * The seam that keeps distribution swappable.
 *
 * v1 ships only GitSource. A hosted index (ApiSource) can implement the same
 * interface later without touching the Scanner or Artifact layers.
 */
export interface PatternSource {
  /** Resolve a reference (e.g. "user/repo", "user/repo/sub", a local path) to a fetched bundle. */
  resolve(ref: string): Promise<Pattern>;
}

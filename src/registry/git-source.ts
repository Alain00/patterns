import type { PatternSource } from "./source.js";
import type { Pattern } from "../core/schema.js";

/**
 * Git-native resolution (ADR-0001): patterns live in git repos, no backend.
 * A ref looks like "user/repo" or "user/repo/subdir" (or a bare local path).
 *
 * Strategy (to implement): shallow-fetch the repo into a cache dir, locate the
 * bundle (patterns.yaml at the resolved subdir), and parseManifest it.
 */
export class GitSource implements PatternSource {
  async resolve(_ref: string): Promise<Pattern> {
    // TODO(v1): parse ref → host/owner/repo/subdir; shallow clone to cache;
    //           return parseManifest(<cache>/<subdir>).
    throw new Error("GitSource.resolve not implemented");
  }
}

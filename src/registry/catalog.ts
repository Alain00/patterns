/**
 * Search the static patterns.directory catalog (v2).
 *
 * Per ADR-0001 there is no backend: the catalog is a static index (e.g. a JSON
 * manifest published alongside the site) that this maps a query against.
 */

export interface CatalogEntry {
  name: string;
  ref: string; // git ref to pass to `patterns add`
  description: string;
  stack: string[];
}

export function search(_query: string): CatalogEntry[] {
  // TODO(v2): fetch the static catalog index and filter by name/description/stack.
  throw new Error("catalog.search not implemented");
}

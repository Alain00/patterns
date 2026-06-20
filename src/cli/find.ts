import { search } from "../registry/catalog";

/** (v2) Search the patterns.directory catalog. */
export function find(query: string): void {
  const results = search(query);
  for (const r of results) {
    console.log(`${r.name} (${r.ref}) — ${r.description}`);
  }
}

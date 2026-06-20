import { search, CatalogUnavailableError } from "../registry/catalog";

/** Search the patterns.directory catalog and print refs ready for `patterns add`. */
export async function find(query: string): Promise<void> {
  let results;
  try {
    results = await search(query);
  } catch (err) {
    if (err instanceof CatalogUnavailableError) {
      console.error(err.message);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  if (!results.length) {
    console.log(`no patterns found for "${query}"`);
    return;
  }

  for (const r of results) {
    const installs = r.installs != null ? ` · ${r.installs} installs` : "";
    console.log(`${r.name} (${r.ref}) — ${r.description}${installs}`);
  }
  console.log(`\ninstall one with: patterns add <ref>`);
}

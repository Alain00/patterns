import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { search, CatalogUnavailableError, apiBase } from "../src/registry/catalog";

let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/api/search") {
        const q = url.searchParams.get("q") ?? "";
        if (q === "empty") return Response.json({ data: [] });
        return Response.json({
          data: [
            { name: "low", source: "acme/low", description: "d", stack: ["node"], installs: 3 },
            { name: "high", ref: "acme/high", description: "d", stack: ["node"], installs: 99 },
          ],
        });
      }
      return new Response("not found", { status: 404 });
    },
  });
  process.env.PATTERNS_API_URL = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
  delete process.env.PATTERNS_API_URL;
});

describe("catalog.search", () => {
  it("honors PATTERNS_API_URL", () => {
    expect(apiBase()).toBe(`http://localhost:${server.port}`);
  });

  it("ranks by installs and normalizes ref/source", async () => {
    const results = await search("anything");
    expect(results.map((r) => r.name)).toEqual(["high", "low"]);
    expect(results[0]?.ref).toBe("acme/high"); // from `ref`
    expect(results[1]?.ref).toBe("acme/low"); // from `source`
  });

  it("returns empty for no matches", async () => {
    expect(await search("empty")).toEqual([]);
  });

  it("raises CatalogUnavailableError on a 404 endpoint", async () => {
    process.env.PATTERNS_API_URL = `http://localhost:${server.port}/missing`;
    await expect(search("x")).rejects.toBeInstanceOf(CatalogUnavailableError);
    process.env.PATTERNS_API_URL = `http://localhost:${server.port}`;
  });
});

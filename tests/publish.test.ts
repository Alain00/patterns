import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { publish, PublishError } from "../src/registry/publish";

let server: ReturnType<typeof Bun.serve>;
let lastBody: unknown;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname !== "/api/patterns" || req.method !== "POST") {
        return new Response("not found", { status: 404 });
      }
      lastBody = await req.json();
      const ref = (lastBody as { ref?: string }).ref ?? "";
      if (ref.startsWith("missing/")) {
        return Response.json({ error: "no patterns.yaml at ref" }, { status: 404 });
      }
      if (ref.startsWith("bad/")) {
        return Response.json({ error: "invalid manifest" }, { status: 422 });
      }
      if (ref.startsWith("flood/")) {
        return new Response("", { status: 429 }); // no JSON body — exercise fallback
      }
      return Response.json(
        { name: "demo", ref, version: "1.2.0", stack: ["node"], installs: 7 },
        { status: 201 },
      );
    },
  });
  process.env.PATTERNS_API_URL = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
  delete process.env.PATTERNS_API_URL;
});

beforeEach(() => {
  lastBody = undefined;
});

describe("publish", () => {
  it("posts the normalized ref and returns the indexed row", async () => {
    const result = await publish("acme/repo.git");
    expect(lastBody).toEqual({ ref: "acme/repo" }); // .git stripped, normalized
    expect(result).toEqual({ name: "demo", ref: "acme/repo", version: "1.2.0", stack: ["node"], installs: 7 });
  });

  it("rejects a malformed ref locally without calling the server", async () => {
    await expect(publish("not-a-ref")).rejects.toBeInstanceOf(PublishError);
    expect(lastBody).toBeUndefined();
  });

  it("surfaces the server error message for a 404", async () => {
    await expect(publish("missing/repo")).rejects.toThrow("no patterns.yaml at ref");
  });

  it("surfaces the server error message for a 422", async () => {
    await expect(publish("bad/repo")).rejects.toThrow("invalid manifest");
  });

  it("falls back to a status message when the error body isn't JSON", async () => {
    await expect(publish("flood/repo")).rejects.toThrow(/429/);
  });
});

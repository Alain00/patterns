import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { pingInstall, telemetryEnabled } from "../src/registry/telemetry";

let server: ReturnType<typeof Bun.serve>;
let pings: string[] = [];

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/api/installs" && req.method === "POST") {
        const body = (await req.json()) as { ref?: string };
        pings.push(body.ref ?? "");
        if (body.ref?.startsWith("missing/")) {
          return Response.json({ error: "not indexed" }, { status: 404 });
        }
        return Response.json({ ref: body.ref, installs: 1 });
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

beforeEach(() => {
  pings = [];
  delete process.env.PATTERNS_TELEMETRY;
});

afterEach(() => {
  delete process.env.PATTERNS_TELEMETRY;
});

describe("telemetryEnabled", () => {
  it("is on by default", () => {
    expect(telemetryEnabled()).toBe(true);
  });

  it("is off for opt-out values", () => {
    for (const v of ["0", "false", "off", "no", "OFF"]) {
      process.env.PATTERNS_TELEMETRY = v;
      expect(telemetryEnabled()).toBe(false);
    }
  });
});

describe("pingInstall", () => {
  it("fires the ping when telemetry is on (default)", async () => {
    await pingInstall("acme/repo.git");
    expect(pings).toEqual(["acme/repo"]); // normalized
  });

  it("skips the ping when telemetry is off", async () => {
    process.env.PATTERNS_TELEMETRY = "0";
    await pingInstall("acme/repo");
    expect(pings).toEqual([]);
  });

  it("skips an unparseable ref without throwing", async () => {
    await pingInstall("not-a-ref");
    expect(pings).toEqual([]);
  });

  it("swallows a 404 (ref not indexed) without throwing", async () => {
    await expect(pingInstall("missing/repo")).resolves.toBeUndefined();
    expect(pings).toEqual(["missing/repo"]);
  });

  it("never throws even when the server is unreachable", async () => {
    const prev = process.env.PATTERNS_API_URL;
    process.env.PATTERNS_API_URL = "http://127.0.0.1:1"; // nothing listening
    await expect(pingInstall("acme/repo")).resolves.toBeUndefined();
    process.env.PATTERNS_API_URL = prev;
  });
});

import { describe, expect, it } from "bun:test";
import { scanProject } from "../src/scanner/map";
import { detectProject } from "../src/detect/findings";

describe("project-dir guard", () => {
  it("scanProject rejects a path that is not a directory", async () => {
    await expect(scanProject("/no/such/dir/xyz123")).rejects.toThrow("not a directory");
  });

  it("detectProject rejects a path that is not a directory", async () => {
    await expect(detectProject("/no/such/dir/xyz123")).rejects.toThrow("not a directory");
  });
});

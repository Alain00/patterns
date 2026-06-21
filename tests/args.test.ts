import { describe, expect, it } from "bun:test";
import { boolFlag, firstPositional, listFlag, numFlag, parseArgs, strFlag } from "../src/cli/args";

describe("parseArgs", () => {
  it("parses --flag=value", () => {
    const p = parseArgs(["--limit=5", "."]);
    expect(strFlag(p, "limit")).toBe("5");
    expect(firstPositional(p)).toBe(".");
  });

  it("parses --flag value", () => {
    const p = parseArgs(["--skip", "gen"]);
    expect(strFlag(p, "skip")).toBe("gen");
  });

  it("treats a bare --flag at the end as a boolean", () => {
    const p = parseArgs(["scan", "--verbose"]);
    expect(boolFlag(p, "verbose")).toBe(true);
    expect(strFlag(p, "verbose")).toBeUndefined();
    expect(firstPositional(p)).toBe("scan");
  });

  it("a declared boolean does not consume the next positional", () => {
    const p = parseArgs(["--include-tests", "."], { booleans: ["include-tests"] });
    expect(boolFlag(p, "include-tests")).toBe(true);
    expect(firstPositional(p)).toBe(".");
  });

  it("an undeclared flag with a following value consumes it, then keeps the positional", () => {
    const p = parseArgs(["--layers", "a|b", "."]);
    expect(strFlag(p, "layers")).toBe("a|b");
    expect(firstPositional(p)).toBe(".");
  });

  it("treats short flags as booleans (-h)", () => {
    const p = parseArgs(["-h"]);
    expect(boolFlag(p, "h")).toBe(true);
  });
});

describe("numFlag", () => {
  it("returns the parsed number", () => {
    expect(numFlag(parseArgs(["--limit", "12"]), "limit")).toBe(12);
  });
  it("returns the default when absent", () => {
    expect(numFlag(parseArgs([]), "limit", 100)).toBe(100);
  });
  it("returns undefined when absent and no default", () => {
    expect(numFlag(parseArgs([]), "limit")).toBeUndefined();
  });
  it("throws a clear error on a non-number", () => {
    expect(() => numFlag(parseArgs(["--limit", "abc"]), "limit")).toThrow(/--limit expects a number/);
  });
});

describe("listFlag", () => {
  it("splits on commas, trims, and drops empty parts", () => {
    expect(listFlag(parseArgs(["--skip", " a, b , ,c "]), "skip")).toEqual(["a", "b", "c"]);
  });
  it("is empty when the flag is absent", () => {
    expect(listFlag(parseArgs([]), "skip")).toEqual([]);
  });
});

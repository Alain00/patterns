import { describe, expect, it } from "bun:test";
import { inferIntended } from "../src/detect/intended";
import type { Convention } from "../src/scanner/types";

/** Convention literal with no examples — sufficient for inference. */
function conv(signal: string, count: number): Convention {
  return { signal, count, examples: [] };
}

describe("inferIntended", () => {
  it("derives layering from dominant layer suffixes, ordered outer→inner", () => {
    const conventions: Convention[] = [
      conv("suffix:service", 5),
      conv("suffix:controller", 4),
      conv("suffix:repository", 3),
      conv("ext:.ts", 20),
    ];
    const intended = inferIntended(conventions, ["nestjs"]);

    expect(intended.layering?.layers).toEqual(["controller", "service", "repository"]);
    expect(intended.stack).toEqual(["nestjs"]);

    // dominant carries the suffix signals with correct shares (family total = 12).
    const svc = intended.dominant.find((d) => d.signal === "suffix:service");
    expect(svc).toBeDefined();
    expect(svc!.count).toBe(5);
    expect(svc!.share).toBeCloseTo(5 / 12, 6);
    expect(intended.dominant.find((d) => d.signal === "suffix:controller")!.share).toBeCloseTo(4 / 12, 6);
    expect(intended.dominant.find((d) => d.signal === "ext:.ts")!.share).toBeCloseTo(1, 6);

    // sorted desc by count
    for (let i = 1; i < intended.dominant.length; i++) {
      expect(intended.dominant[i - 1]!.count).toBeGreaterThanOrEqual(intended.dominant[i]!.count);
    }
  });

  it("singularizes dir signals to match layer keywords, including -ies plurals", () => {
    const conventions: Convention[] = [
      conv("dir:controllers", 6),
      conv("dir:services", 5),
      conv("dir:repositories", 4), // 'repositories' → 'repository' (handled, not dropped)
    ];
    const layers = inferIntended(conventions, []).layering?.layers;
    expect(layers).toEqual(["controller", "service", "repository"]);
  });

  it("returns null layering when no layer keywords are dominant", () => {
    const conventions: Convention[] = [
      conv("suffix:spec", 4),
      conv("suffix:test", 3),
      conv("ext:.ts", 10),
    ];
    const intended = inferIntended(conventions, []);
    expect(intended.layering).toBeNull();
  });

  it("returns null layering with fewer than 2 distinct layer keywords", () => {
    const conventions: Convention[] = [conv("suffix:service", 5), conv("ext:.ts", 5)];
    expect(inferIntended(conventions, []).layering).toBeNull();
  });

  it("keeps low-share signals only when count >= 3", () => {
    // family suffix total = 30; share of 'helper' (2/30) < 0.2 and count < 3 → dropped.
    const conventions: Convention[] = [
      conv("suffix:service", 25),
      conv("suffix:controller", 3), // count >= 3 → kept despite low share
      conv("suffix:helper", 2), // dropped
    ];
    const dominant = inferIntended(conventions, []).dominant;
    expect(dominant.find((d) => d.signal === "suffix:controller")).toBeDefined();
    expect(dominant.find((d) => d.signal === "suffix:helper")).toBeUndefined();
  });
});

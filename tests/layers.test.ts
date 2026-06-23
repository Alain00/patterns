import { describe, expect, it } from "bun:test";
import { fileLayer, singularizeDir } from "../src/detect/layers";

describe("layers", () => {
  it("maps files to layers by filename suffix", () => {
    expect(fileLayer("src/orders/orders.service.ts")).toBe("service");
    expect(fileLayer("orders.controller.ts")).toBe("controller");
    expect(fileLayer("app.module.ts")).toBeNull();
  });

  it("maps files to layers by directory, handling -ies plurals", () => {
    expect(fileLayer("src/services/pricing.ts")).toBe("service");
    expect(fileLayer("src/repositories/order.ts")).toBe("repository");
    expect(fileLayer("src/entities/user.ts")).toBe("entity");
  });

  it("singularizeDir handles regular and -ies plurals", () => {
    expect(singularizeDir("services")).toBe("service");
    expect(singularizeDir("controllers")).toBe("controller");
    expect(singularizeDir("repositories")).toBe("repository");
    expect(singularizeDir("entities")).toBe("entity");
  });
});

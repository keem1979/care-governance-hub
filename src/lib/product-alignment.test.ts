import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(resolve(path), "utf8");
}

describe("Phase 0 product alignment", () => {
  it("keeps the controlling documents aligned to continuous assurance", () => {
    const charter = read("PRODUCT_SCOPE.md");
    const architecture = read("ARCHITECTURE.md");
    const dataModel = read("DATA_MODEL.md");

    expect(charter).toContain("continuous governance, assurance and action-closure");
    expect(charter).toContain("Care Inspectorate Wales");
    expect(charter).toContain("Care plans are in scope as controlled governance records");
    expect(architecture).toContain("Regulatory content is versioned configuration");
    expect(dataModel).toContain("Automatic merging of");
    expect(dataModel).toContain("ambiguous people or staff is prohibited");
  });

  it("defines every Phase 0 control document", () => {
    for (const path of [
      "PRODUCT_ROADMAP.md",
      "MODULE_ASSURANCE_MAP.md",
      "PRODUCT_METRICS.md",
      "REGULATORY_FRAMEWORKS.md",
    ]) {
      expect(read(path).length, path).toBeGreaterThan(500);
    }
  });

  it("uses the approved market position on the public home page", () => {
    const home = read("src/app/(marketing)/page.tsx");
    const platform = read("src/app/(marketing)/platform/page.tsx");

    expect(home).toContain("Know what is unsafe, overdue or unverified");
    expect(home).toContain("improvement was completed and sustained");
    expect(platform).not.toContain("not a care planning system");
    expect(platform).toContain("not eMAR, rostering or daily point-of-care recording");
  });
});

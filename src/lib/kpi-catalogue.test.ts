import { describe, expect, it } from "vitest";
import { kpiCatalogueSection, KPI_CATALOGUE_SECTIONS } from "@/lib/kpi-catalogue";

describe("KPI catalogue presentation", () => {
  it("places monthly performance measures first", () => {
    expect(KPI_CATALOGUE_SECTIONS[0].key).toBe("monthly-performance");
    expect(kpiCatalogueSection("scc-missed-calls")).toBe("monthly-performance");
  });

  it("groups assurance measures into plain-language domains", () => {
    expect(kpiCatalogueSection("medication-errors")).toBe("safe-care");
    expect(kpiCatalogueSection("dbs-compliance")).toBe("workforce");
    expect(kpiCatalogueSection("service-user-satisfaction")).toBe("experience-outcomes");
    expect(kpiCatalogueSection("audit-completion")).toBe("governance");
  });
});

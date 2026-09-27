import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RiskForm } from "@/components/risk-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("new Risk without an effective organisation framework", () => {
  it("requires human appetite, tolerance and treatment choices", () => {
    const html = renderToStaticMarkup(createElement(RiskForm, { locations: [], owners: [], evidence: [] }));
    const select = (name: string) => html.match(new RegExp(`<select[^>]*name="${name}"[^>]*>[\\s\\S]*?<\\/select>`))?.[0] ?? "";
    for (const name of ["appetite", "treatmentStrategy"]) {
      expect(select(name)).toContain("required");
      expect(select(name)).toMatch(/<option value=""[^>]*selected/);
    }
    expect(html).toMatch(/<input[^>]*name="toleranceScore"[^>]*required|<input[^>]*required[^>]*name="toleranceScore"/);
    expect(html).toMatch(/<input[^>]*name="toleranceScore"[^>]*value=""/);
    expect(html).toContain("Current risk not yet assessed");
  });
});

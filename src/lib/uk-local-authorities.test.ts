import { describe, expect, it, vi } from "vitest";
import { authorityTypeFromCode, nationFromCode, searchUkLocalAuthorities } from "@/lib/uk-local-authorities";

describe("UK local authority directory", () => {
  it("derives all four UK nations and authority types from GSS codes", () => {
    expect(nationFromCode("E06000001")).toBe("England");
    expect(nationFromCode("W06000001")).toBe("Wales");
    expect(nationFromCode("S12000033")).toBe("Scotland");
    expect(nationFromCode("N09000001")).toBe("Northern Ireland");
    expect(authorityTypeFromCode("S12000033")).toBe("Scottish council area");
  });

  it("maps the official ONS feature response without maintaining a typed list", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      features: [{ attributes: { LAD25CD: "W06000015", LAD25NM: "Cardiff" } }],
    }), { status: 200 })) as unknown as typeof fetch;
    const results = await searchUkLocalAuthorities("Cardiff", fetcher);
    expect(results).toEqual([expect.objectContaining({ code: "W06000015", name: "Cardiff", nation: "Wales", status: "current" })]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("can include retired codes from official historic ONS snapshots", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const text = String(url);
      const attributes = text.includes("LAD_APR_2025")
        ? { LAD25CD: "E06000001", LAD25NM: "Current Council" }
        : text.includes("LAD_DEC_2024")
          ? { LAD24CD: "E07000999", LAD24NM: "Historic Council" }
          : { LAD22CD: "E07000999", LAD22NM: "Historic Council" };
      return new Response(JSON.stringify({ features: [{ attributes }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const results = await searchUkLocalAuthorities("Council", fetcher, true);
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "E06000001", status: "current" }),
      expect.objectContaining({ code: "E07000999", status: "historic" }),
    ]));
  });
});

import { describe, expect, it } from "vitest";
import { rankQuickFindItems, type QuickFindItem } from "@/lib/quick-find";

const items: QuickFindItem[] = [
  { id: "1", kind: "CLIENT", label: "Alex Morgan", reference: "CLI-200", meta: "Active", href: "/clients/1", search: ["Alex Morgan", "CLI-200"] },
  { id: "2", kind: "CLIENT", label: "Morgan Alex", reference: "CLI-100", meta: "Active", href: "/clients/2", search: ["Morgan Alex", "CLI-100"] },
  { id: "3", kind: "CLIENT", label: "Zara Jones", reference: "ALEX", meta: "Active", href: "/clients/3", search: ["Zara Jones", "ALEX"] },
];

describe("rankQuickFindItems", () => {
  it("requires at least two characters", () => {
    expect(rankQuickFindItems("a", items)).toEqual([]);
  });

  it("ranks exact references before name prefixes and word prefixes", () => {
    expect(rankQuickFindItems("alex", items).map(({ id }) => id)).toEqual(["3", "1", "2"]);
  });

  it("returns bounded results without internal search fields", () => {
    const results = rankQuickFindItems("alex", items, 2);
    expect(results).toHaveLength(2);
    expect(results[0]).not.toHaveProperty("search");
  });
});

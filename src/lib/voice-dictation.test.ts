import { describe, expect, it } from "vitest";
import { insertDictation } from "@/lib/voice-dictation";

describe("voice dictation text insertion", () => {
  it("inserts speech at the caret with readable spacing", () => {
    expect(insertDictation("Review due", 6, 6, "policy")).toEqual({
      value: "Review policy due",
      caret: 13,
    });
  });

  it("replaces the selected text", () => {
    expect(insertDictation("Old summary", 0, 3, "Updated")).toEqual({
      value: "Updated summary",
      caret: 7,
    });
  });

  it("does not change the field for an empty transcript", () => {
    expect(insertDictation("Existing", 8, 8, "   ")).toEqual({
      value: "Existing",
      caret: 8,
    });
  });
});

import { describe, expect, it } from "vitest";
import { validateProfilePhoto } from "@/lib/profile-photo";

describe("validateProfilePhoto", () => {
  it("accepts a file whose declared type and signature match", async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "profile.png",
      { type: "image/png" },
    );

    await expect(validateProfilePhoto(file)).resolves.toMatchObject({
      contentType: "image/png",
    });
  });

  it("rejects a renamed non-image file", async () => {
    const file = new File(["not an image"], "profile.png", { type: "image/png" });

    await expect(validateProfilePhoto(file)).rejects.toThrow("not a valid image");
  });

  it("rejects unsupported image types", async () => {
    const file = new File(["GIF89a"], "profile.gif", { type: "image/gif" });

    await expect(validateProfilePhoto(file)).rejects.toThrow("JPG, PNG or WebP");
  });
});

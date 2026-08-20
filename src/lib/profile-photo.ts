const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) =>
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    ),
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
};

export async function validateProfilePhoto(
  value: FormDataEntryValue | null,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose a JPG, PNG or WebP picture.");
  }
  if (value.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("Choose a picture no larger than 2 MB.");
  }
  const matchesSignature = signatures[value.type];
  if (!matchesSignature) {
    throw new Error("Choose a JPG, PNG or WebP picture.");
  }
  const bytes = await value.arrayBuffer();
  if (!matchesSignature(new Uint8Array(bytes))) {
    throw new Error("The selected file is not a valid image.");
  }
  return { bytes, contentType: value.type };
}

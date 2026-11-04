export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "An uppercase and a lowercase letter", test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: "A number", test: (value: string) => /[0-9]/.test(value) },
  { label: "A symbol", test: (value: string) => /[^\p{L}\p{N}\s]/u.test(value) },
];

export function getPasswordError(password: string, confirmation: string): string | null {
  if (PASSWORD_RULES.some((rule) => !rule.test(password))) {
    return "Use at least 8 characters, uppercase and lowercase letters, a number and a symbol.";
  }
  return password === confirmation ? null : "Passwords do not match.";
}

export const MAX_PHOTO_BYTES = 512 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function getPhotoError(file: { size: number; type: string }): string | null {
  if (file.size === 0) return "Choose a non-empty image.";
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPG, PNG or WebP image.";
  if (file.size > MAX_PHOTO_BYTES) return "Choose an image up to 512 KB.";
  return null;
}

export function hasPhotoSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  if (type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

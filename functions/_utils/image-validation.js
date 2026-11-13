export function detectImageMime(bytes) {
  if (!(bytes instanceof Uint8Array)) return "";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const header = new TextDecoder().decode(bytes.slice(0, 12));
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) return "image/gif";
  if (header.slice(0, 4) === "RIFF" && header.slice(8, 12) === "WEBP") return "image/webp";
  return "";
}

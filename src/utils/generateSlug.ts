export function generateSlug(name: string) {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

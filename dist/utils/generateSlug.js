export function generateSlug(name) {
    return name.toUpperCase().trim().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}
//# sourceMappingURL=generateSlug.js.map
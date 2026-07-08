export const escapeRegex = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
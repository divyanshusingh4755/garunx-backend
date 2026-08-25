export const generateUniqueCode = () => {
    // Convert timestamp to Base36 and remove non-alphanumeric chars
    const rawTimestamp = (Date.now() + performance.now()).toString(36).toUpperCase();
    const cleanTimestamp = rawTimestamp.replace(/[^A-Z0-9]/g, "").slice(-6);
    // Generate random string and remove the "0." part correctly
    const rawRandom = Math.random().toString(36).toUpperCase();
    const cleanRandom = rawRandom.replace(/[^A-Z0-9]/g, "").slice(0, 3);
    return `${cleanTimestamp}${cleanRandom}`;
};
//# sourceMappingURL=generateUniqueCode.js.map
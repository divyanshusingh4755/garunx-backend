export const generateUniqueCode = () => {
    // convert current timestamp to Base36
    const timestamp = (Date.now() + performance.now()).toString(36).toUpperCase().slice(-6);
    // Add 3 random characters
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${timestamp}${randomStr}`
}
const userSockets = new Map();
export const addUserSocket = (userId, socketId) => {
    let sockets = userSockets.get(userId);
    if (!sockets) {
        sockets = new Set();
        userSockets.set(userId, sockets);
    }
    sockets.add(socketId);
    return sockets.size;
};
export const removeUserSocket = (userId, socketId) => {
    const sockets = userSockets.get(userId);
    if (!sockets) {
        return 0;
    }
    sockets.delete(socketId);
    if (sockets.size === 0) {
        userSockets.delete(userId);
        return 0;
    }
    return sockets.size;
};
export const getUserSocketCount = (userId) => { return userSockets.get(userId)?.size ?? 0; };
export const isUserOnline = (userId) => { return getUserSocketCount(userId) > 0; };
//# sourceMappingURL=socket.presence.js.map
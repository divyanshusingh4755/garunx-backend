const userSockets = new Map<string, Set<string>>();

export const addUserSocket = (userId: string, socketId: string): number => {
    let sockets = userSockets.get(userId);

    if (!sockets) {
        sockets = new Set<string>();
        userSockets.set(userId, sockets);
    }

    sockets.add(socketId);
    return sockets.size;
}

export const removeUserSocket = (userId: string, socketId: string): number => {
    const sockets = userSockets.get(userId);

    if (!sockets) { return 0 }

    sockets.delete(socketId);

    if (sockets.size === 0) {
        userSockets.delete(userId);
        return 0;
    }

    return sockets.size;
}

export const getUserSocketCount = (userId: string): number => { return userSockets.get(userId)?.size ?? 0; }

export const isUserOnline = (userId: string): boolean => { return getUserSocketCount(userId) > 0; }
import { Server } from "socket.io";
import { allowedOrigins } from "../config/cors.js";
import { verifyAccessToken } from "../utils/accessToken.js";
import { registerConversationHandlers, registerDeliveryHandlers, registerMessageHandlers, registerPresenceHandlers, registerReadHandlers, registerTypingHandlers } from "./handlers/conversation.handler.js";
import { getUserRoom } from "./socket.rooms.js";
import { addUserSocket, removeUserSocket } from "./socket.presence.js";
import { ChatConversationService } from "../services/chatconversation.service.js";
import { setSocketServer } from "./socket.instance.js";
export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (origin === undefined || allowedOrigins.has(origin)) {
                    callback(null, true);
                    return;
                }
                callback(new Error("Not allowed by CORS"));
            },
            credentials: true,
        }
    });
    setSocketServer(io);
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (typeof token !== "string" || !token.trim()) {
                next(new Error("Authentication required"));
                return;
            }
            const decoded = verifyAccessToken(token);
            if (!decoded) {
                next(new Error("Invalid access token payload"));
                return;
            }
            socket.data.userId = decoded.userId;
            socket.data.role = decoded.role;
            next();
        }
        catch {
            next(new Error("Invalid or expired access token"));
        }
    });
    io.on("connection", async (socket) => {
        const userId = socket.data.userId;
        console.log(`Socket connected: ${socket.id} | user: ${socket.data.userId}`);
        const userRoom = getUserRoom(userId);
        await socket.join(userRoom);
        console.log(`User ${userId} joined personal room ${userRoom}`);
        const activeSocketCount = addUserSocket(userId, socket.id);
        try {
            if (activeSocketCount === 1) {
                const participantIds = await ChatConversationService.getParticipantUserIds({ userId });
                for (const participantId of participantIds) {
                    io.to(getUserRoom(participantId)).emit("presence:changed", { userId, isOnline: true });
                }
            }
        }
        catch (error) {
            console.log(`Failed to broadcast online presence for user ${userId}`, error);
        }
        registerConversationHandlers(io, socket);
        registerMessageHandlers(io, socket);
        registerReadHandlers(io, socket);
        registerPresenceHandlers(io, socket);
        registerDeliveryHandlers(io, socket);
        registerTypingHandlers(io, socket);
        socket.on("disconnect", async (reason) => {
            const remainingSocketCount = removeUserSocket(userId, socket.id);
            try {
                if (remainingSocketCount === 0) {
                    const participantIds = await ChatConversationService.getParticipantUserIds({ userId });
                    for (const participantId of participantIds) {
                        io.to(getUserRoom(participantId)).emit("presence:changed", { userId, isOnline: false });
                    }
                }
            }
            catch (error) {
                console.error(`Failed to broadcast offline presence for user ${userId}`, error);
            }
            console.log(`Socket disconnected: ${socket.id} | user: ${userId} | remaining sockets: ${remainingSocketCount} | reason: ${reason}`);
        });
    });
    return io;
};
//# sourceMappingURL=index.js.map
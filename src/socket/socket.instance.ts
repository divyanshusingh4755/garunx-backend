import type { ChatSocketServer } from "./index.js";

let ioInstance: ChatSocketServer | null = null;

export const setSocketServer = (
    io: ChatSocketServer,
): void => {
    ioInstance = io;
};

export const getSocketServer =
    (): ChatSocketServer | null => {
        return ioInstance;
    };
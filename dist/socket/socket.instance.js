let ioInstance = null;
export const setSocketServer = (io) => {
    ioInstance = io;
};
export const getSocketServer = () => {
    return ioInstance;
};
//# sourceMappingURL=socket.instance.js.map
import type { ChatSocket, ChatSocketServer } from "../index.js";
export declare const registerReadHandlers: (io: ChatSocketServer, socket: ChatSocket) => void;
export declare const registerMessageHandlers: (io: ChatSocketServer, socket: ChatSocket) => void;
export declare const registerConversationHandlers: (_io: ChatSocketServer, socket: ChatSocket) => void;
export declare const registerPresenceHandlers: (_io: ChatSocketServer, socket: ChatSocket) => void;
export declare const registerDeliveryHandlers: (io: ChatSocketServer, socket: ChatSocket) => void;
export declare const registerTypingHandlers: (_io: ChatSocketServer, socket: ChatSocket) => void;
//# sourceMappingURL=conversation.handler.d.ts.map
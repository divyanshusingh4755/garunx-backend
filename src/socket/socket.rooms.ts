export const getConversationRoom = (conversationId: string): string => { return `conversation:${conversationId}`; }

export const getUserRoom = (userId: string): string => { return `user:${userId}` } 
/**
 * Chat Types
 * Types for user-to-user messaging stored in Supabase.
 */

/** Chat conversation between two users */
export interface ChatConversation {
    id: string;
    participantIds: string[];
    lastMessageAt: string | null;
    createdAt: string;
}

/** Individual chat message */
export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    readAt: string | null;
    createdAt: string;
}

/** Chat conversation with preview */
export interface ChatPreview {
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatarUrl: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
}

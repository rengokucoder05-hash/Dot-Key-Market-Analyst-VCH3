import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { Message, Attachment } from "./types";

interface GetMessagesParams {
  id: string;
}

interface GetMessagesResponse {
  messages: Message[];
}

// Retrieves all messages for a conversation belonging to the authenticated user.
export const getMessages = api<GetMessagesParams, GetMessagesResponse>(
  { expose: true, auth: true, method: "GET", path: "/chat/conversations/:id/messages" },
  async (params) => {
    const authData = getAuthData()!;

    const conv = await db.queryRow<{ user_id: string }>`
      SELECT user_id FROM conversations WHERE id = ${params.id}
    `;

    if (!conv || conv.user_id !== authData.userID) {
      throw APIError.notFound("conversation not found");
    }

    const rows = await db.queryAll<{
      id: string;
      conversation_id: string;
      role: "user" | "assistant";
      content: string;
      attachments: Attachment[];
      created_at: Date;
    }>`SELECT * FROM messages WHERE conversation_id = ${params.id} ORDER BY created_at ASC`;

    return {
      messages: rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        role: r.role,
        content: r.content,
        attachments: r.attachments || [],
        createdAt: r.created_at,
      })),
    };
  }
);

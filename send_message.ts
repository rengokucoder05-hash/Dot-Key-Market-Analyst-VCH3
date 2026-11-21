import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { randomUUID } from "crypto";
import db from "../db";
import { Message, Attachment } from "./types";
import { analyzeWithGemini } from "../gemini/analyze";

interface SendMessageParams {
  conversationId: string;
  content: string;
  attachments?: Attachment[];
  model?: string;
  market?: string;
}

interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message;
}

// Sends a message in a conversation and returns the AI response.
export const sendMessage = api<SendMessageParams, SendMessageResponse>(
  { expose: true, auth: true, method: "POST", path: "/chat/message" },
  async (params) => {
    const authData = getAuthData()!;

    const conv = await db.queryRow<{ user_id: string; model: string; market: string; title: string }>`
      SELECT user_id, model, market, title FROM conversations WHERE id = ${params.conversationId}
    `;

    if (!conv || conv.user_id !== authData.userID) {
      throw APIError.notFound("conversation not found");
    }

    const userMsgId = randomUUID();
    const attachments = params.attachments || [];

    await db.exec`
      INSERT INTO messages (id, conversation_id, role, content, attachments)
      VALUES (${userMsgId}, ${params.conversationId}, 'user', ${params.content}, ${JSON.stringify(attachments)}::jsonb)
    `;

    const history = await db.queryAll<{
      role: "user" | "assistant";
      content: string;
    }>`
      SELECT role, content FROM messages
      WHERE conversation_id = ${params.conversationId}
      ORDER BY created_at ASC
      LIMIT 20
    `;

    const model = params.model || conv.model || "lite";
    const market = params.market || conv.market || "India";

    const aiResponse = await analyzeWithGemini({
      message: params.content,
      history: history.slice(0, -1),
      model,
      market,
      attachments,
    });

    const assistantMsgId = randomUUID();
    await db.exec`
      INSERT INTO messages (id, conversation_id, role, content, attachments)
      VALUES (${assistantMsgId}, ${params.conversationId}, 'assistant', ${aiResponse}, '[]'::jsonb)
    `;

    if (history.length <= 1 && params.content.length > 0) {
      const autoTitle = params.content.slice(0, 60) + (params.content.length > 60 ? "..." : "");
      await db.exec`
        UPDATE conversations SET title = ${autoTitle}, updated_at = NOW()
        WHERE id = ${params.conversationId}
      `;
    } else {
      await db.exec`
        UPDATE conversations SET updated_at = NOW()
        WHERE id = ${params.conversationId}
      `;
    }

    const userRow = await db.queryRow<{
      id: string; conversation_id: string; role: "user" | "assistant";
      content: string; attachments: Attachment[]; created_at: Date;
    }>`SELECT * FROM messages WHERE id = ${userMsgId}`;

    const assistantRow = await db.queryRow<{
      id: string; conversation_id: string; role: "user" | "assistant";
      content: string; attachments: Attachment[]; created_at: Date;
    }>`SELECT * FROM messages WHERE id = ${assistantMsgId}`;

    return {
      userMessage: {
        id: userRow!.id,
        conversationId: userRow!.conversation_id,
        role: userRow!.role,
        content: userRow!.content,
        attachments: userRow!.attachments || [],
        createdAt: userRow!.created_at,
      },
      assistantMessage: {
        id: assistantRow!.id,
        conversationId: assistantRow!.conversation_id,
        role: assistantRow!.role,
        content: assistantRow!.content,
        attachments: assistantRow!.attachments || [],
        createdAt: assistantRow!.created_at,
      },
    };
  }
);

import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { Conversation } from "./types";

interface ListConversationsResponse {
  conversations: Conversation[];
}

// Lists all conversations for the authenticated user.
export const listConversations = api<void, ListConversationsResponse>(
  { expose: true, auth: true, method: "GET", path: "/chat/conversations" },
  async () => {
    const authData = getAuthData()!;
    const userId = authData.userID;

    const rows = await db.queryAll<{
      id: string;
      user_id: string;
      title: string;
      model: string;
      market: string;
      created_at: Date;
      updated_at: Date;
    }>`SELECT * FROM conversations WHERE user_id = ${userId} ORDER BY updated_at DESC`;

    return {
      conversations: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        model: r.model,
        market: r.market,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  }
);

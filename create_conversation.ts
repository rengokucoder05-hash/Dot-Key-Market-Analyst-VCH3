import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { randomUUID } from "crypto";
import db from "../db";
import { Conversation } from "./types";

interface CreateConversationParams {
  title?: string;
  model?: string;
  market?: string;
}

// Creates a new conversation for the authenticated user.
export const createConversation = api<CreateConversationParams, Conversation>(
  { expose: true, auth: true, method: "POST", path: "/chat/conversations" },
  async (params) => {
    const authData = getAuthData()!;
    const id = randomUUID();
    const userId = authData.userID;
    const title = params.title || "New Conversation";
    const model = params.model || "lite";
    const market = params.market || "India";

    await db.exec`
      INSERT INTO conversations (id, user_id, title, model, market)
      VALUES (${id}, ${userId}, ${title}, ${model}, ${market})
    `;

    const row = await db.queryRow<{
      id: string;
      user_id: string;
      title: string;
      model: string;
      market: string;
      created_at: Date;
      updated_at: Date;
    }>`SELECT * FROM conversations WHERE id = ${id}`;

    return {
      id: row!.id,
      userId: row!.user_id,
      title: row!.title,
      model: row!.model,
      market: row!.market,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  }
);

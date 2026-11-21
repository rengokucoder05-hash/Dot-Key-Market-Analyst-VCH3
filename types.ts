export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  market: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  attachments: Attachment[];
  createdAt: Date;
}

export interface Attachment {
  type: "image" | "pdf" | "csv";
  name: string;
  data: string; // base64 or text content
  mimeType: string;
}

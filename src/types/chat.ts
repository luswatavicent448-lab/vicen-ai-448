export type Message = {
  role: "user" | "assistant";
  content: string;
  approved?: boolean; // teacher approval status
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export type UserMode = "guest" | "signed-in";

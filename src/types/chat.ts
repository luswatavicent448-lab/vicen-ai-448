export type Citation = {
  title: string;
  url: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export type UserMode = "guest" | "signed-in";

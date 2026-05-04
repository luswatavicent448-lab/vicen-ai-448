export type Citation = {
  title: string;
  url: string;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  // Multi-length response system (assistant messages only)
  lengthMode?: "short" | "medium" | "detailed" | "auto";
  variants?: Partial<Record<"short" | "medium" | "detailed", string>>;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
};

export type UserMode = "guest" | "signed-in";

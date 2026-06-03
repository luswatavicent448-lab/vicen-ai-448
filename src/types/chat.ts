export type Citation = {
  title: string;
  url: string;
};

export type VicenImage = {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  category: string;
  sub_category: string;
  tags: string[];
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  images?: VicenImage[];
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

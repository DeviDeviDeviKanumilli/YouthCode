// The swappable plant-chat provider interface (mirrors PlantIdentifier). Routes depend only on
// this; the factory in ./index picks OpenAI vs the offline stub.

export interface PlantChatTurn {
  role: "user" | "plant";
  content: string;
}

export interface PlantChatInput {
  systemPrompt: string;
  history: PlantChatTurn[]; // recent turns, oldest first
  message: string; // the new user message
}

export interface PlantChatter {
  reply(input: PlantChatInput): Promise<string>;
}

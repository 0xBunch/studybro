import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function parseJSON(text: string): unknown {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(stripped);
}

export async function extractConcepts(text: string) {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      'You are a study material analyzer. Given the following text from a student\'s notes or slides, extract:\n1. A list of key concepts (each with a term and definition/explanation)\n2. Important relationships between concepts\n3. Key facts that would make good quiz questions\nReturn ONLY raw JSON (no code fences): { "concepts": [{ "term": string, "definition": string, "category": string }], "facts": [{ "statement": string, "topic": string }] }',
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJSON(content.text) as {
    concepts: { term: string; definition: string; category: string }[];
    facts: { statement: string; topic: string }[];
  };
}

export async function generateQuiz(
  concepts: { term: string; definition: string; category: string }[],
  count: number = 10
) {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `Generate ${count} multiple-choice questions from these concepts. Each question should have 4 options with exactly 1 correct answer. Vary difficulty. Return ONLY raw JSON (no code fences): { "questions": [{ "question": string, "options": string[], "correctIndex": number, "explanation": string, "concept": string }] }`,
    messages: [{ role: "user", content: JSON.stringify(concepts) }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJSON(content.text) as {
    questions: {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
      concept: string;
    }[];
  };
}

export async function generateFlashcards(
  concepts: { term: string; definition: string; category: string }[]
) {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      'Generate flashcards from these concepts. Front = term or key phrase. Back = clear, concise explanation. Return ONLY raw JSON (no code fences): { "cards": [{ "front": string, "back": string, "concept": string }] }',
    messages: [{ role: "user", content: JSON.stringify(concepts) }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJSON(content.text) as {
    cards: { front: string; back: string; concept: string }[];
  };
}

export async function generateReverseFlashcards(
  concepts: { term: string; definition: string; category: string }[]
) {
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      'Generate reverse flashcards. Front = definition or description. Back = the term or concept being described. Return ONLY raw JSON (no code fences): { "cards": [{ "front": string, "back": string, "concept": string }] }',
    messages: [{ role: "user", content: JSON.stringify(concepts) }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return parseJSON(content.text) as {
    cards: { front: string; back: string; concept: string }[];
  };
}

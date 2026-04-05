/**
 * Computes dynamic teaching state from the message history.
 * Fed to the prompt assembler to generate tight imperative directives
 * like "Student has struggled twice — shift to direct explanation."
 */

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface TeachingState {
  messageCount: number;
  phase: "opening" | "probing" | "wrapping";
  recentStruggle: boolean;
  studentConfidence: "low" | "medium" | "high";
  recap: string | null;
}

// Heuristics for classifying student messages
const STRUGGLE_MARKERS = [
  /\bidk\b/i,
  /\bi don'?t know\b/i,
  /\bnot sure\b/i,
  /\bgive me a hint\b/i,
  /\bi'?m stuck\b/i,
  /\bi'?m lost\b/i,
  /\bconfused\b/i,
  /\bwhat\?\b/i,
  /^huh\b/i,
  /explain (that |it )?(differently|another way|again)/i,
];

const CONFIDENCE_MARKERS = [
  /\bgot it\b/i,
  /\bmakes sense\b/i,
  /\bi see\b/i,
  /\bcool\b/i,
  /\bthat's it\b/i,
  /\byes(!|\.)/i,
  /\bcorrect\b/i,
];

export function computeTeachingState(messages: Message[]): TeachingState {
  const assistantCount = messages.filter((m) => m.role === "assistant").length;
  const userMessages = messages.filter((m) => m.role === "user");

  // Phase
  const phase: TeachingState["phase"] =
    assistantCount < 3 ? "opening" : assistantCount < 10 ? "probing" : "wrapping";

  // Recent struggle: look at last 2 user messages
  const recentUser = userMessages.slice(-2);
  const recentStruggle = recentUser.some((m) =>
    STRUGGLE_MARKERS.some((re) => re.test(m.content))
  );

  // Confidence: count markers in last 4 user messages
  const lastFourUser = userMessages.slice(-4);
  let confidenceScore = 0;
  for (const m of lastFourUser) {
    if (CONFIDENCE_MARKERS.some((re) => re.test(m.content))) confidenceScore++;
    if (STRUGGLE_MARKERS.some((re) => re.test(m.content))) confidenceScore--;
  }
  const studentConfidence: TeachingState["studentConfidence"] =
    confidenceScore >= 2 ? "high" : confidenceScore <= -1 ? "low" : "medium";

  // Recap: generate at message 8+
  const recap =
    assistantCount >= 8
      ? buildRecap(messages, { recentStruggle, studentConfidence })
      : null;

  return {
    messageCount: assistantCount,
    phase,
    recentStruggle,
    studentConfidence,
    recap,
  };
}

function buildRecap(
  _messages: Message[],
  state: { recentStruggle: boolean; studentConfidence: string }
): string {
  const parts: string[] = [];
  if (state.studentConfidence === "high") {
    parts.push("Student is engaged and getting things right consistently.");
  } else if (state.studentConfidence === "low") {
    parts.push("Student has been struggling recently.");
  } else {
    parts.push("Student is mid-engagement — some hits, some misses.");
  }
  if (state.recentStruggle) {
    parts.push("They just signaled confusion in their latest message.");
  }
  return parts.join(" ");
}

/**
 * Produces a short imperative directive for the assembled prompt
 * based on the computed state. This is what actually steers the tutor.
 */
export function buildTeachingDirective(state: TeachingState): string {
  const lines: string[] = [];

  // Phase guidance
  if (state.phase === "opening") {
    lines.push(
      "You are in the OPENING phase. Establish voice and introduce one concept specifically."
    );
  } else if (state.phase === "probing") {
    lines.push(
      "You are in the PROBING phase. Test understanding, push deeper, vary concepts."
    );
  } else {
    lines.push(
      "You are in the WRAPPING phase. Start circling back to earlier material. Connect concepts."
    );
  }

  // Struggle response
  if (state.recentStruggle || state.studentConfidence === "low") {
    lines.push(
      "Student is struggling. Shift from probing questions to a clear direct explanation with one vivid analogy, then ask a simpler check question."
    );
  } else if (state.studentConfidence === "high") {
    lines.push(
      "Student is crushing it. Level up difficulty. Connect this concept to something you haven't touched yet."
    );
  }

  // Callback cue
  if (state.messageCount >= 10) {
    lines.push(
      "You are deep into the session — actively reference something the student said earlier in the conversation to reinforce learning."
    );
  }

  return lines.join(" ");
}

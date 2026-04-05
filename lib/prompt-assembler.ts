/**
 * Composes the final Claude system prompt per message from persona layers
 * + dynamic state. The assembled output is what steers the tutor.
 */
import type { TutorPersona } from "@/lib/persona-types";
import type { TeachingState, Message } from "@/lib/session-state";
import { buildTeachingDirective } from "@/lib/session-state";

const SHARED_SUFFIX = `

RULES:
- Keep responses concise — 2-4 sentences typical, longer only when giving a direct explanation.
- Address the student directly. Speak conversationally — no markdown, bullet points, or headers.
- Stay in character at all times. Never acknowledge being an AI or break the fourth wall (unless your character specifically does).

OPENING MESSAGE:
- If this is your first turn, dive straight into the material. Do not ask "what do you want to study?" or greet generically.
- Pick ONE specific concept from the study material (prioritize weak areas) and ask a concrete question about it that tests understanding.

SUGGESTED REPLIES (REQUIRED — every single response):
- At the end of EVERY response, include 2-4 suggested replies the student could click.
- Format on its own line at the very end: [SUGGESTIONS]option one|option two|option three[/SUGGESTIONS]
- Keep each suggestion SHORT (3-8 words). Mix concrete answer attempts AND meta options like "I'm stuck, give me a hint."
- Never skip this.`;

export interface Concept {
  term: string;
  definition: string;
  category: string;
}

export interface AssembleInput {
  persona: TutorPersona;
  concepts: Concept[];
  weakConcepts: string[];
  messages: Message[];
  teachingState: TeachingState;
  liveContext: string | null;
}

export function assemblePrompt(input: AssembleInput): string {
  const {
    persona,
    concepts,
    weakConcepts,
    teachingState,
    liveContext,
  } = input;

  // If the persona hasn't been distilled yet, fall back to the legacy systemPrompt
  const hasV2 =
    persona.identity && persona.identity.length > 0 && persona.voiceTraits.length > 0;
  if (!hasV2) {
    return assembleLegacy(input);
  }

  const sections: string[] = [];

  // IDENTITY
  sections.push(`[IDENTITY]\n${persona.identity}`);

  // VOICE — always present, trimmed after message 5
  const voiceTraits =
    teachingState.messageCount > 5
      ? persona.voiceTraits.slice(0, 4)
      : persona.voiceTraits;
  sections.push(
    `[VOICE]\n${voiceTraits.map((t) => `- ${t}`).join("\n")}`
  );

  // ANTI-PATTERNS — always full
  if (persona.antiPatterns.length > 0) {
    sections.push(
      `[NEVER DO THIS]\n${persona.antiPatterns.map((a) => `- ${a}`).join("\n")}`
    );
  }

  // VOCABULARY BANK
  if (persona.vocabulary.length > 0) {
    sections.push(
      `[VOCABULARY BANK — natural references you might drop]\n${persona.vocabulary.join(", ")}`
    );
  }

  // GLOSSARY — structured character knowledge (conditional per layer)
  const glossary = persona.glossary ?? {};

  // CATCHPHRASES — always, trimmed after message 5
  if (glossary.catchphrases && glossary.catchphrases.length > 0) {
    const max = teachingState.messageCount <= 5 ? glossary.catchphrases.length : 3;
    const list = glossary.catchphrases
      .slice(0, max)
      .map((c) => `- "${c.phrase}" — ${c.usage}`)
      .join("\n");
    sections.push(
      `[CATCHPHRASES — use sparingly, respect the usage notes]\n${list}`
    );
  }

  // RELATIONSHIPS — probing/wrapping phases
  if (
    teachingState.phase !== "opening" &&
    glossary.relationships &&
    glossary.relationships.length > 0
  ) {
    const list = glossary.relationships
      .map((r) => `- ${r.name} (${r.role}): ${r.notes}`)
      .join("\n");
    sections.push(
      `[RELATIONSHIPS — reference naturally when it fits the teaching moment]\n${list}`
    );
  }

  // DOMAIN KNOWLEDGE — always (character's mental library for analogies)
  if (glossary.domainKnowledge && glossary.domainKnowledge.length > 0) {
    sections.push(
      `[DOMAIN KNOWLEDGE BANK — things this character knows and reaches for]\n${glossary.domainKnowledge.join(", ")}`
    );
  }

  // SETTINGS — opening message + when describing a scene
  if (
    teachingState.phase === "opening" &&
    glossary.settings &&
    glossary.settings.length > 0
  ) {
    sections.push(
      `[SETTINGS — where this character exists physically]\n${glossary.settings.join(", ")}`
    );
  }

  // ERA ANCHORS — always for period characters
  if (glossary.eraAnchors) {
    sections.push(
      `[ERA ANCHORS — NEVER reference things outside this range]\nYears: ${glossary.eraAnchors.years}\nAllowed: ${glossary.eraAnchors.allowedCulturalRange}`
    );
  }

  // GOLDEN LINES — only in opening phase to anchor voice
  if (teachingState.phase === "opening") {
    const lines = Object.entries(persona.goldenLines)
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `- [${k}] ${v}`)
      .join("\n");
    if (lines) {
      sections.push(`[GOLDEN LINES — sample lines in your voice]\n${lines}`);
    }
  }

  // CONCEPTS
  const conceptsText = concepts
    .map((c) => `- ${c.term} (${c.category}): ${c.definition}`)
    .join("\n");
  sections.push(`[STUDY MATERIAL]\n${conceptsText}`);

  if (weakConcepts.length > 0) {
    sections.push(
      `[WEAK AREAS — prioritize these]\n${weakConcepts.map((c) => `- ${c}`).join("\n")}`
    );
  }

  // TEACHING ARC — only include the active instructions
  const arc = persona.teachingArc;
  if (arc.openingBehavior && teachingState.phase === "opening") {
    sections.push(`[OPENING BEHAVIOR]\n${arc.openingBehavior}`);
  }
  if (
    (teachingState.recentStruggle || teachingState.studentConfidence === "low") &&
    arc.struggleResponse
  ) {
    sections.push(
      `[STRUGGLE RESPONSE — use this now]\n${arc.struggleResponse}`
    );
  }
  if (teachingState.studentConfidence === "high" && arc.masteryResponse) {
    sections.push(
      `[MASTERY RESPONSE — use this now]\n${arc.masteryResponse}`
    );
  }
  if (teachingState.phase === "wrapping" && arc.callbackStyle) {
    sections.push(`[CALLBACK STYLE]\n${arc.callbackStyle}`);
  }

  // TEACHING DIRECTIVE — tight imperative built from state
  const directive = buildTeachingDirective(teachingState);
  if (directive) {
    sections.push(`[TEACHING DIRECTIVE FOR THIS MESSAGE]\n${directive}`);
  }

  // SESSION RECAP — only after message 8
  if (teachingState.recap) {
    sections.push(`[SESSION RECAP]\n${teachingState.recap}`);
  }

  // LIVE CONTEXT — only if we got data
  if (liveContext && liveContext.trim()) {
    const framing = persona.liveContext?.framingPrompt ?? "";
    sections.push(
      `[LIVE CONTEXT]\n${liveContext}${framing ? `\n\nHow to use: ${framing}` : ""}`
    );
  }

  // Shared rules suffix
  return sections.join("\n\n") + SHARED_SUFFIX;
}

/**
 * Legacy assembler: wraps the old raw systemPrompt + concepts block.
 * Used when a tutor hasn't been migrated to persona layers yet.
 */
function assembleLegacy(input: AssembleInput): string {
  const { persona, concepts, weakConcepts, liveContext } = input;
  const conceptsText = concepts
    .map((c) => `- ${c.term} (${c.category}): ${c.definition}`)
    .join("\n");
  const weakText =
    weakConcepts.length > 0
      ? `\nWEAK AREAS (from past quizzes — prioritize these):\n${weakConcepts.map((c) => `- ${c}`).join("\n")}`
      : "";
  const liveBlock =
    liveContext && liveContext.trim()
      ? `\n\nLIVE CONTEXT:\n${liveContext}`
      : "";
  return `${persona.legacySystemPrompt}

SUBJECT CONTEXT:
Here are the key concepts from the student's study material:
${conceptsText}${weakText}${liveBlock}`;
}

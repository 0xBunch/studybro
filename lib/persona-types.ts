// Structured persona layers — composed at runtime into a Claude system prompt

export type LiveContextSource =
  | "time"
  | "weather"
  | "news"
  | "reddit"
  | "markets"
  | "multi-news"; // Weekend Update's multi-category feed

export interface LiveContextConfig {
  source: LiveContextSource;
  /** Source-specific config (e.g. { lat, lon } for weather, { subreddit } for reddit) */
  config: Record<string, unknown>;
  /** Instructions to the tutor for HOW to use this data in character */
  framingPrompt: string;
}

export interface GoldenLines {
  opening?: string;
  correct?: string;
  wrong?: string;
  explain?: string;
  transition?: string;
  closing?: string;
}

export interface TeachingArc {
  openingBehavior?: string;
  struggleTriggers?: string[];
  struggleResponse?: string;
  masteryResponse?: string;
  callbackStyle?: string;
}

export interface Catchphrase {
  phrase: string;
  usage: string;
}

export interface Relationship {
  name: string;
  role: string;
  notes: string;
}

export interface EraAnchors {
  years: string;
  allowedCulturalRange: string;
}

export interface Glossary {
  catchphrases?: Catchphrase[];
  relationships?: Relationship[];
  domainKnowledge?: string[];
  settings?: string[];
  eraAnchors?: EraAnchors;
}

export interface TutorPersona {
  id: string;
  name: string;
  description: string;
  avatar: string;
  image: string | null;
  scene: string | null;

  // Layers
  identity: string;
  voiceTraits: string[];
  antiPatterns: string[];
  goldenLines: GoldenLines;
  vocabulary: string[];
  glossary: Glossary;
  teachingArc: TeachingArc;
  liveContext: LiveContextConfig | null;
  webSearchEnabled: boolean;

  // Legacy fallback while migrating
  legacySystemPrompt: string;

  // Admin
  sortOrder: number;
  enabled: boolean;
}

/**
 * Per-tutor real-time data fetchers. Each source cached 12 hours.
 * All fetchers return a short human-readable string ready to inject.
 * Graceful fallback to null on failure.
 */
import type { TutorPersona, LiveContextSource } from "@/lib/persona-types";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const cache = new Map<string, { value: string; fetchedAt: number }>();

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
  return entry.value;
}

function setCached(key: string, value: string): void {
  cache.set(key, { value, fetchedAt: Date.now() });
}

// ─── Time context ────────────────────────────────────────────────────────────

function fetchTimeContext(): string {
  const now = new Date();
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const hour = now.getHours();
  const timeOfDay =
    hour < 6 ? "late night" :
    hour < 12 ? "morning" :
    hour < 17 ? "afternoon" :
    hour < 21 ? "evening" : "night";
  const month = now.toLocaleDateString("en-US", { month: "long" });
  return `It is ${timeOfDay} on a ${day} in ${month}.`;
}

// ─── Weather (open-meteo.com, no API key needed) ─────────────────────────────

const LOCATIONS: Record<string, { lat: number; lon: number; name: string }> = {
  nyc: { lat: 40.7128, lon: -74.0060, name: "NYC" },
  brooklyn: { lat: 40.6782, lon: -73.9442, name: "Brooklyn" },
};

async function fetchWeather(location: string): Promise<string | null> {
  const loc = LOCATIONS[location];
  if (!loc) return null;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
      { next: { revalidate: 43200 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const temp = Math.round(data.current?.temperature_2m ?? 0);
    const code = data.current?.weather_code ?? 0;
    const condition = describeWeatherCode(code);
    return `${loc.name} weather: ${temp}°F, ${condition}.`;
  } catch {
    return null;
  }
}

function describeWeatherCode(code: number): string {
  // WMO codes → English
  if (code === 0) return "clear sky";
  if (code <= 3) return "partly cloudy";
  if (code <= 48) return "foggy";
  if (code <= 67) return "rainy";
  if (code <= 77) return "snowy";
  if (code <= 82) return "rainy";
  if (code <= 86) return "snowy";
  if (code >= 95) return "thunderstorms";
  return "unsettled";
}

// ─── Reddit top posts (public JSON, no key) ──────────────────────────────────

async function fetchRedditTop(
  subreddit: string,
  limit = 5
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=${limit}`,
      {
        headers: {
          "User-Agent": "ChurroAcademy/1.0 (educational use)",
        },
        next: { revalidate: 43200 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const posts: string[] = [];
    for (const child of data.data?.children ?? []) {
      const title = child.data?.title;
      if (title) posts.push(`• ${title}`);
    }
    if (posts.length === 0) return null;
    return `Top posts in r/${subreddit} today:\n${posts.join("\n")}`;
  } catch {
    return null;
  }
}

// ─── News (uses existing lib/news.ts) ────────────────────────────────────────

import { getCategoryHeadlines } from "@/lib/news";

async function fetchNewsCategory(category: string): Promise<string | null> {
  try {
    const cats = await getCategoryHeadlines(5);
    const match = cats.find(
      (c) => c.category.toLowerCase() === category.toLowerCase()
    );
    if (!match || match.headlines.length === 0) return null;
    const lines = match.headlines.map((h) => `• ${h.title}`).join("\n");
    return `Recent ${category} headlines:\n${lines}`;
  } catch {
    return null;
  }
}

async function fetchMultiNews(): Promise<string | null> {
  try {
    const cats = await getCategoryHeadlines(3);
    const nonEmpty = cats.filter((c) => c.headlines.length > 0);
    if (nonEmpty.length === 0) return null;
    return nonEmpty
      .map(
        (c) =>
          `${c.category.toUpperCase()}:\n${c.headlines.map((h) => `• ${h.title}`).join("\n")}`
      )
      .join("\n\n");
  } catch {
    return null;
  }
}

// ─── Markets (Yahoo Finance free endpoint) ────────────────────────────────────

async function fetchMarkets(): Promise<string | null> {
  try {
    const symbols = ["^GSPC", "^VIX", "^DJI", "^IXIC"];
    const labels = ["S&P 500", "VIX", "Dow", "Nasdaq"];
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        next: { revalidate: 43200 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.quoteResponse?.result ?? [];
    if (results.length === 0) return null;
    const lines: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const price = results[i].regularMarketPrice;
      const change = results[i].regularMarketChangePercent;
      if (price !== undefined) {
        lines.push(
          `${labels[i]}: ${price.toFixed(2)} (${change >= 0 ? "+" : ""}${change.toFixed(2)}%)`
        );
      }
    }
    if (lines.length === 0) return null;
    return `Markets today:\n${lines.join("\n")}`;
  } catch {
    return null;
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────

export async function getLiveContextForTutor(
  persona: TutorPersona
): Promise<string | null> {
  if (!persona.liveContext) return null;

  const { source, config } = persona.liveContext;
  const cacheKey = `${source}:${JSON.stringify(config)}`;

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  let value: string | null = null;

  try {
    switch (source as LiveContextSource) {
      case "time":
        value = fetchTimeContext();
        break;
      case "weather":
        value = await fetchWeather((config.location as string) || "nyc");
        break;
      case "news":
        value = await fetchNewsCategory((config.category as string) || "Top");
        break;
      case "multi-news":
        value = await fetchMultiNews();
        break;
      case "reddit":
        value = await fetchRedditTop(
          (config.subreddit as string) || "news",
          (config.limit as number) || 5
        );
        break;
      case "markets":
        value = await fetchMarkets();
        break;
      default:
        value = null;
    }
  } catch (err) {
    console.error(`Live context fetch failed for ${source}:`, err);
    value = null;
  }

  if (value !== null) setCached(cacheKey, value);
  return value;
}

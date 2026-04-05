// Fetches current top headlines from Google News RSS (no API key required)

interface Headline {
  title: string;
  source: string;
}

// In-memory cache — headlines refresh every 15 minutes
let cache: { headlines: Headline[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getTopHeadlines(count = 10): Promise<Headline[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.headlines.slice(0, count);
  }

  try {
    const res = await fetch(
      "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ChurroAcademy/1.0)" },
        next: { revalidate: 900 },
      }
    );
    if (!res.ok) throw new Error(`News fetch failed: ${res.status}`);
    const xml = await res.text();

    const headlines = parseRssHeadlines(xml);
    cache = { headlines, fetchedAt: Date.now() };
    return headlines.slice(0, count);
  } catch (err) {
    console.error("Failed to fetch headlines:", err);
    // Return stale cache if we have it, otherwise empty
    return cache?.headlines.slice(0, count) ?? [];
  }
}

function parseRssHeadlines(xml: string): Headline[] {
  const items: Headline[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/;
  const sourceRegex = /<source[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/source>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(titleRegex);
    const sourceMatch = block.match(sourceRegex);
    if (titleMatch) {
      // Google News RSS titles include " - SourceName" suffix; strip it
      const rawTitle = decode(titleMatch[1]);
      const source = sourceMatch ? decode(sourceMatch[1]) : "";
      const title = source
        ? rawTitle.replace(new RegExp(` - ${escapeRegex(source)}$`), "")
        : rawTitle;
      items.push({ title: title.trim(), source });
    }
  }

  return items;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

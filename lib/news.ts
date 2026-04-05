// Fetches current top headlines from Google News RSS (no API key required)
// Multi-category so Weekend Update can pick topically relevant stories

interface Headline {
  title: string;
  source: string;
  description?: string;
}

export interface CategoryHeadlines {
  category: string;
  headlines: Headline[];
}

// Google News RSS topic codes
const FEEDS = [
  { category: "Top", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en" },
  { category: "US", url: "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-US&gl=US&ceid=US:en" },
  { category: "World", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en" },
  { category: "Tech", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en" },
  { category: "Science", url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en" },
  { category: "Entertainment", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en" },
  { category: "Sports", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en" },
];

// In-memory cache — headlines refresh every 15 minutes
let cache: { data: CategoryHeadlines[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function getCategoryHeadlines(
  perCategory = 5
): Promise<CategoryHeadlines[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data.map((c) => ({
      ...c,
      headlines: c.headlines.slice(0, perCategory),
    }));
  }

  try {
    const results = await Promise.all(
      FEEDS.map(async ({ category, url }) => {
        try {
          const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ChurroAcademy/1.0)",
            },
            next: { revalidate: 900 },
          });
          if (!res.ok) return { category, headlines: [] };
          const xml = await res.text();
          return { category, headlines: parseRssHeadlines(xml).slice(0, 10) };
        } catch {
          return { category, headlines: [] };
        }
      })
    );

    cache = { data: results, fetchedAt: Date.now() };
    return results.map((c) => ({
      ...c,
      headlines: c.headlines.slice(0, perCategory),
    }));
  } catch (err) {
    console.error("Failed to fetch headlines:", err);
    return cache?.data ?? [];
  }
}

// Backwards-compatible: flatten top headlines for any caller that wants a simple list
export async function getTopHeadlines(count = 10): Promise<Headline[]> {
  const cats = await getCategoryHeadlines(count);
  return cats.find((c) => c.category === "Top")?.headlines ?? [];
}

function parseRssHeadlines(xml: string): Headline[] {
  const items: Headline[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
  const sourceRegex = /<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/;
  const descRegex =
    /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(titleRegex);
    const sourceMatch = block.match(sourceRegex);
    const descMatch = block.match(descRegex);
    if (titleMatch) {
      const rawTitle = decode(titleMatch[1]);
      const source = sourceMatch ? decode(sourceMatch[1]) : "";
      const title = source
        ? rawTitle.replace(new RegExp(` - ${escapeRegex(source)}$`), "")
        : rawTitle;
      // Google News wraps description in HTML — strip tags to get plain text snippet
      const description = descMatch
        ? stripTags(decode(descMatch[1])).slice(0, 200)
        : undefined;
      items.push({ title: title.trim(), source, description });
    }
  }

  return items;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

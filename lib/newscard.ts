/**
 * Renders a Weekend Update-style news card as an inline SVG.
 *
 * The card mimics the over-the-shoulder graphic: blue gradient background
 * with a city-silhouette pattern, pun headline in Trade Gothic-ish
 * sans-serif, and a colorful illustration zone.
 *
 * Pure SVG means no server image libs needed (no sharp/canvas) and
 * no external API calls. Works offline, ships instantly.
 */

interface NewsCardInput {
  pun: string;
  cartoonDesc: string;
}

// Pick a representative emoji based on keywords in the description.
// Crude but effective for instant visuals.
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/\b(sun|solar|photosynthes|plant|leaf|garden)\b/i, "☀️"],
  [/\b(water|droplet|osmosis|liquid|ocean|river)\b/i, "💧"],
  [/\b(cell|mitochondri|bacteri|organism|dna|gene)\b/i, "🧬"],
  [/\b(brain|neuron|nerve|mind|memory)\b/i, "🧠"],
  [/\b(heart|cardio|blood|artery)\b/i, "❤️"],
  [/\b(atom|molecule|chemistr|element|reaction)\b/i, "⚗️"],
  [/\b(rocket|space|planet|orbit|astro)\b/i, "🚀"],
  [/\b(math|number|equation|formula|calcul)\b/i, "🔢"],
  [/\b(book|write|read|literatur|story)\b/i, "📖"],
  [/\b(history|ancient|roman|greek|civil war|revolution)\b/i, "🏛️"],
  [/\b(money|economy|bank|market|finance|invest)\b/i, "💰"],
  [/\b(tree|forest|nature|wild|anim)\b/i, "🌳"],
  [/\b(fire|burn|flame|heat|explos)\b/i, "🔥"],
  [/\b(ice|cold|frozen|snow|winter)\b/i, "❄️"],
  [/\b(music|sound|note|instrument)\b/i, "🎵"],
  [/\b(light|lamp|glow|shine|ray)\b/i, "💡"],
  [/\b(earth|globe|world|continent)\b/i, "🌍"],
  [/\b(bird|fly|wing)\b/i, "🐦"],
  [/\b(wave|radio|signal|frequency)\b/i, "📡"],
  [/\b(gear|machine|engine|mechanic)\b/i, "⚙️"],
];

function pickEmoji(desc: string): string {
  for (const [pattern, emoji] of KEYWORD_EMOJI) {
    if (pattern.test(desc)) return emoji;
  }
  return "🎬"; // default
}

// Wrap text to multiple lines for SVG rendering
function wrapText(text: string, maxChars: number): string[] {
  const words = text.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderNewsCardSvg({ pun, cartoonDesc }: NewsCardInput): string {
  const emoji = pickEmoji(cartoonDesc);
  const lines = wrapText(pun, 18);
  const fontSize = lines.length > 2 ? 30 : lines.length === 2 ? 36 : 42;
  const lineHeight = fontSize * 1.15;
  const totalTextHeight = lines.length * lineHeight;
  const textStartY = 200 - totalTextHeight / 2 + lineHeight * 0.8;

  // Build <text> elements
  const textLines = lines
    .map(
      (line, i) =>
        `<text x="280" y="${textStartY + i * lineHeight}" font-family="Georgia, 'Times New Roman', serif" font-weight="900" font-size="${fontSize}" fill="white" letter-spacing="1">${escapeXml(line)}</text>`
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360" role="img" aria-label="${escapeXml(pun)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a2540"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <linearGradient id="redbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#c41e3a"/>
      <stop offset="100%" stop-color="#8b0a1e"/>
    </linearGradient>
  </defs>

  <!-- Studio blue backdrop -->
  <rect width="640" height="360" fill="url(#sky)"/>

  <!-- City skyline silhouette -->
  <g fill="#061a33" opacity="0.6">
    <rect x="0" y="220" width="40" height="140"/>
    <rect x="35" y="180" width="55" height="180"/>
    <rect x="85" y="210" width="35" height="150"/>
    <rect x="115" y="160" width="50" height="200"/>
    <rect x="160" y="195" width="40" height="165"/>
    <rect x="195" y="175" width="60" height="185"/>
    <rect x="250" y="205" width="35" height="155"/>
    <rect x="280" y="185" width="45" height="175"/>
    <rect x="320" y="215" width="40" height="145"/>
    <rect x="355" y="170" width="55" height="190"/>
    <rect x="405" y="200" width="40" height="160"/>
    <rect x="440" y="185" width="50" height="175"/>
    <rect x="485" y="210" width="35" height="150"/>
    <rect x="515" y="175" width="55" height="185"/>
    <rect x="565" y="195" width="40" height="165"/>
    <rect x="600" y="215" width="40" height="145"/>
    <!-- little windows -->
    <g fill="#f4c430" opacity="0.3">
      <rect x="45" y="195" width="3" height="5"/>
      <rect x="52" y="195" width="3" height="5"/>
      <rect x="130" y="175" width="3" height="5"/>
      <rect x="210" y="195" width="3" height="5"/>
      <rect x="295" y="200" width="3" height="5"/>
      <rect x="370" y="185" width="3" height="5"/>
      <rect x="455" y="200" width="3" height="5"/>
      <rect x="530" y="190" width="3" height="5"/>
    </g>
  </g>

  <!-- Left illustration panel -->
  <rect x="40" y="40" width="200" height="280" fill="#f4c430" opacity="0.95" rx="4"/>
  <text x="140" y="200" text-anchor="middle" font-size="140" dominant-baseline="middle">${emoji}</text>

  <!-- Red accent bar -->
  <rect x="260" y="40" width="340" height="8" fill="url(#redbar)"/>

  <!-- Pun headline -->
  ${textLines}

  <!-- Bottom red accent -->
  <rect x="260" y="310" width="340" height="10" fill="url(#redbar)"/>

  <!-- "Weekend Update" badge -->
  <rect x="260" y="325" width="155" height="22" fill="white" opacity="0.9" rx="2"/>
  <text x="268" y="341" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#0a2540" letter-spacing="0.5">WEEKEND UPDATE</text>
</svg>`;
}

/**
 * Returns a data URL of the rendered SVG, ready to use in <img src={url}>.
 */
export function renderNewsCardDataUrl(input: NewsCardInput): string {
  const svg = renderNewsCardSvg(input);
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

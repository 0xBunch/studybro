#!/usr/bin/env python3
"""Generate classroom/scene images for each tutor using Gemini Nano Banana Pro.

Each image represents the tutor's environment/vibe in a distinct art style.
No faces or real people — thematic imagery only.

Run: GEMINI_API_KEY=xxx python3 scripts/generate-tutor-scenes.py
"""
import os
import sys
from google import genai
from google.genai import types

OUTPUT_DIR = "public/tutors"

TUTOR_SCENES = [
    {
        "id": "socrates",
        "prompt": (
            "A classical oil painting in the style of Jacques-Louis David. "
            "A peaceful ancient Greek agora at golden hour, marble columns, olive trees, "
            "stone steps where philosophers gathered. Warm earth tones, amber, ochre, cream. "
            "Empty of people. Soft light streaming between columns. "
            "Painterly brushwork, museum quality. Cinematic, contemplative mood."
        ),
    },
    {
        "id": "lonely-island",
        "prompt": (
            "A vibrant cartoon illustration in the style of an SNL Digital Short title card. "
            "Three vintage radio microphones on stands on the deck of a small boat at sea, "
            "sunset sky with wild gradient colors — hot pink, electric purple, tangerine orange. "
            "Sparkles and cartoon energy lines. A small island in the distance. "
            "Bold comic book style, thick black outlines, saturated pop colors. "
            "Empty of people, just the three mics and the boat."
        ),
    },
    {
        "id": "seinfeld",
        "prompt": (
            "Flat vector illustration in the style of a 1990s sitcom title card. "
            "A classic New York diner booth, two empty coffee cups, a small plate with "
            "a half-eaten black and white cookie. Window view of Manhattan street. "
            "Muted pastels — cream, seafoam green, soft coral, beige. "
            "Clean minimal lines, no people. Nostalgic 90s television vibe. "
            "Composition centered, warm nostalgic lighting."
        ),
    },
    {
        "id": "ryland-grace",
        "prompt": (
            "A clean sci-fi digital illustration in the style of a modern astronomy textbook. "
            "Interior of a small spacecraft cockpit, looking out a circular window at a distant "
            "tan-colored alien planet with a red dwarf star behind it. Soft blue instrument glow. "
            "Scientific notes and whiteboard scribbles on a surface. Warm teal and amber palette. "
            "Empty of people. Cinematic, curious, hopeful mood. Clean vector aesthetic."
        ),
    },
    {
        "id": "jared-vennett",
        "prompt": (
            "A moody 2008 Wall Street noir illustration. "
            "A dimly lit high-rise office at night, Bloomberg terminal screens glowing green "
            "and red with stock tickers and CDO charts. A half-empty scotch glass on a mahogany desk. "
            "A newspaper headline reading about the financial crisis in the foreground, blurred. "
            "City lights through floor-to-ceiling windows. Deep blacks, amber highlights, smoke. "
            "Cinematic noir, Michael Mann energy. Empty of people."
        ),
    },
    {
        "id": "weekend-update",
        "prompt": (
            "A Saturday Night Live Weekend Update news desk, empty, viewed head-on. "
            "The iconic blue and white cityscape backdrop of New York, neon signs glowing. "
            "Two empty anchor chairs, two laptops with notecards, a coffee mug. "
            "Studio lighting warm and theatrical. TV studio cables visible at edges. "
            "Illustrated in a slightly stylized editorial illustration style, clean but graphic. "
            "Empty of people. Late night TV glow."
        ),
    },
    {
        "id": "jean-ralphio",
        "prompt": (
            "A garish neon club illustration in the style of a Lisa Frank x Miami Vice mashup. "
            "An empty Pawnee-style nightclub interior. Spinning disco ball, fog machine mist, "
            "a martini glass with olives on the bar. Neon signs spelling made-up business names "
            "like 'Entertainment 720' glowing. Hot pink, cyan, chrome silver palette. "
            "Glitter texture, cartoon sparkles. High energy. Empty of people. Tacky and amazing."
        ),
    },
    {
        "id": "hdtgm",
        "prompt": (
            "A cinematic horror movie poster illustration. "
            "A vintage film clapperboard mid-explosion, film reels unspooling chaotically, "
            "strips of celluloid flying through the air. Dramatic red and yellow lighting with "
            "deep black shadows. A popcorn bucket knocked over. Old projector flickering. "
            "Screaming faces drawn on the film strips, just abstract line art. "
            "B-movie aesthetic, Drew Struzan influence. Empty of people."
        ),
    },
    {
        "id": "jake-peralta",
        "prompt": (
            "A detective noir illustration in the style of a Brooklyn Nine-Nine promo image. "
            "A gritty NYPD precinct bullpen at night, evidence board with strings and photos "
            "(obscured), a detective's desk with a half-eaten sandwich, an empty coffee mug "
            "labeled 'WORLD'S BEST DETECTIVE/GENIUS', and a Die Hard VHS tape on top of a case file. "
            "Warm fluorescent overhead light, one desk lamp glow, city through window blinds. "
            "Stylized comic illustration, bold outlines. Empty of people. Witty detective vibe."
        ),
    },
    {
        "id": "how-long-gone",
        "prompt": (
            "A minimalist illustration of a Delta One airplane cabin, two empty first-class pod seats "
            "side by side. One seat has a copy of The New Yorker and a New Era cap, the other has "
            "a pair of white Jordans and Monocle magazine. The cabin window shows a city skyline "
            "split between Manhattan skyscrapers on left and LA palm trees on right. "
            "Muted minimal palette — cream, navy, gray, soft gold. "
            "Clean editorial illustration style, architectural. Empty of people. Bicoastal elite vibes."
        ),
    },
]


def generate_image(client, tutor_id, prompt):
    print(f"Generating {tutor_id}...")
    try:
        response = client.models.generate_content(
            model="gemini-3-pro-image-preview",
            contents=[prompt],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio="16:9",
                ),
            ),
        )

        for part in response.parts:
            if part.inline_data:
                image = part.as_image()
                path = os.path.join(OUTPUT_DIR, f"{tutor_id}-scene.jpg")
                image.save(path)
                print(f"  ✓ saved {path}")
                return True

        print(f"  ✗ no image in response")
        return False
    except Exception as e:
        print(f"  ✗ error: {e}")
        return False


def main():
    if not os.environ.get("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY env var not set", file=sys.stderr)
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    succeeded = 0
    failed = 0
    for tutor in TUTOR_SCENES:
        if generate_image(client, tutor["id"], tutor["prompt"]):
            succeeded += 1
        else:
            failed += 1

    print(f"\nDone: {succeeded} succeeded, {failed} failed")


if __name__ == "__main__":
    main()

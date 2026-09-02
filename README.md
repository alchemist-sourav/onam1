# Pookalam — Code a Pookalam
host link:
(https://generative-pookalam-gtr8.bolt.host)

A creative-coding playground that generates unique, Kerala-inspired **Pookalams** (floral rangoli / Onam flower carpets) entirely through code. Every design is deterministic from a numeric seed — the same seed always produces the same Pookalam, so designs are shareable and reproducible.

Built with **React + TypeScript + Vite**, **p5.js** for canvas rendering, and **Tailwind CSS** for the UI.

## Features

- **Seeded generation** — a mulberry32 PRNG turns a seed number into a full `PookalamConfig`. Share the seed, get the same design back.
- **8 pattern families** — Classic Floral, Lotus Mandala, Geometric, Temple, Sunburst, Spiral Floral, Star Mandala, and Contemporary.
- **10 curated color palettes** — Traditional, Sunset, Lotus, Royal, Forest, Jewel, Earth, Peacock, Moonlight, Monochrome.
- **Fine-tuned controls** — pattern, palette, symmetry (4–24 fold), petal style (round / pointed / lotus / marigold / mixed), complexity (simple → ultra), and ring density.
- **Surprise Me** — randomizes pattern and palette for a one-click fresh design.
- **Live p5.js canvas** — animated reveal (rings cascade outer → inner), ambient drifting particles, click-to-burst petals, and a mouse glow / ripple.
- **Export** — download a PNG, save a high-res 2048px PNG, or copy the rendered image to the clipboard.
- **Share** — copies a design summary (seed, pattern, palette) to the clipboard.
- **Design history** — previous designs are kept in-memory so you can restore them.
- **Thumbnail / hi-res renderer** — a standalone offscreen p5 sketch renders any config to a static PNG (used for thumbnails and high-res export).

## How it works

| Module | Responsibility |
| --- | --- |
| `src/pookalam/generator.ts` | Pure logic. Turns a seed + options into a serializable `PookalamConfig` (rings, palette, symmetry, center style, border). No p5 dependency. |
| `src/pookalam/renderer.ts` | p5 instance sketch that animates the live canvas, plus an offscreen static renderer for thumbnails and hi-res export. |
| `src/components/PookalamApp.tsx` | Top-level UI: hero, generation controls, canvas, design details, export menu, history. |
| `src/components/Controls.tsx` | Reusable UI primitives (Segmented control, Slider, PaletteChips, InfoTip). |
| `src/hooks/useHistory.ts` | In-memory history of previously generated configs. |

A `PookalamConfig` is a plain serializable object describing the rings (radius bands, kind, count, color, motif, rotation speed), center style, outer border, palette, symmetry, and petal style. The renderer interprets it; the generator produces it.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
npm run typecheck
npm run lint
```

## Tech stack

- **Vite 5** — dev server & bundler
- **React 18** + **TypeScript 5**
- **p5.js 2** — canvas rendering
- **Tailwind CSS 3** — styling
- **lucide-react** — icons

## License

Personal project. All rights reserved.

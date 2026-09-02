// Generation core for "Code a Pookalam".
// Pure logic — no p5. Produces a serializable PookalamConfig from a seed,
// choosing a pattern family, palette, symmetry, ring count, petal style, etc.

export type PatternType =
  | 'classic' | 'lotus' | 'geometric' | 'temple' | 'sunburst'
  | 'spiral' | 'star' | 'contemporary';

export type PetalStyle = 'round' | 'pointed' | 'lotus' | 'marigold' | 'mixed';
export type Complexity = 'simple' | 'balanced' | 'intricate' | 'ultra';
export type CenterStyle =
  | 'lotus' | 'floral' | 'sun' | 'star' | 'rosette' | 'geometric' | 'minimal';
export type OuterBorder =
  | 'flower' | 'petal' | 'dot' | 'leaf' | 'geometric' | 'double' | 'lotus';

export interface Palette {
  id: string;
  name: string;
  colors: string[]; // ordered, used cyclically per ring
  accent: string; // bright accent for center / dots
  ground: string; // deep background tint
}

export interface RingSpec {
  /** radii as fraction of outer pookalam radius (0..1) */
  rOuter: number;
  rInner: number;
  kind: 'petal' | 'flower' | 'geo' | 'dot';
  count: number; // radial symmetry count for this ring
  color: string;
  color2?: string; // alt color (flowers / petals)
  motif?: 'diamond' | 'dot' | 'dotTriplet' | 'leaf' | 'triangle' | 'star';
  petals?: number; // petals per flower (flower kind)
  rotSpeed: number; // radians/sec decorative rotation
  /** per-ring petal style override; falls back to config.petalStyle */
  petalStyle?: PetalStyle;
  /** subtle inward/outward point offset for spiral patterns (radians) */
  twist?: number;
}

export interface PookalamConfig {
  seed: number;
  patternType: PatternType;
  paletteId: string;
  palette: Palette;
  ringCount: number;
  symmetry: number;
  petalStyle: PetalStyle;
  density: number; // 0..1
  complexity: Complexity;
  centerStyle: CenterStyle;
  outerBorder: OuterBorder;
  rotationOffset: number;
  rings: RingSpec[];
  generatedAt: number;
}

// ---- Palettes (10 + custom placeholder) ---------------------------------
export const PALETTES: Palette[] = [
  { id: 'traditional', name: 'Traditional', colors: ['#F4B83D', '#E26A1C', '#C0392B', '#F3E9D2', '#3E8E5F'], accent: '#E89B2E', ground: '#2a0d11' },
  { id: 'sunset', name: 'Sunset', colors: ['#FF8C61', '#FF6B6B', '#FFA07A', '#FFD166', '#E84A8E'], accent: '#FFD166', ground: '#2b1018' },
  { id: 'lotus', name: 'Lotus', colors: ['#F08FB0', '#E84A8E', '#F3E9D2', '#C9A7D8', '#3E8E5F'], accent: '#E84A8E', ground: '#241420' },
  { id: 'royal', name: 'Royal', colors: ['#7B3FA0', '#E89B2E', '#A11D1D', '#F3E9D2', '#C9A7D8'], accent: '#E89B2E', ground: '#1a0e26' },
  { id: 'forest', name: 'Forest', colors: ['#3E8E5F', '#2A6B49', '#F4B83D', '#E8D9B0', '#5BB98A'], accent: '#F4B83D', ground: '#0e1f15' },
  { id: 'jewel', name: 'Jewel', colors: ['#C0392B', '#2E5E8C', '#3E8E5F', '#E89B2E', '#F3E9D2'], accent: '#E89B2E', ground: '#15151f' },
  { id: 'earth', name: 'Earth', colors: ['#B5651D', '#8B4513', '#E8D9B0', '#C68A4B', '#D4A76A'], accent: '#E8D9B0', ground: '#241710' },
  { id: 'peacock', name: 'Peacock', colors: ['#1B8A8A', '#2E86AB', '#3E8E5F', '#E89B2E', '#F3E9D2'], accent: '#E89B2E', ground: '#0a1f24' },
  { id: 'moonlight', name: 'Moonlight', colors: ['#E6E6FA', '#C0C0C0', '#9B7EBD', '#2E3B5C', '#F3E9D2'], accent: '#E6E6FA', ground: '#0e1424' },
  { id: 'monochrome', name: 'Monochrome', colors: ['#F3E9D2', '#E8D9B0', '#D4C28A', '#E89B2E', '#BFA76A'], accent: '#E89B2E', ground: '#1a1611' },
];

export const PATTERN_LABELS: Record<PatternType, string> = {
  classic: 'Classic Floral',
  lotus: 'Lotus Mandala',
  geometric: 'Geometric',
  temple: 'Temple',
  sunburst: 'Sunburst',
  spiral: 'Spiral Floral',
  star: 'Star Mandala',
  contemporary: 'Contemporary',
};

export const PATTERN_IDS: PatternType[] = ['classic', 'lotus', 'geometric', 'temple', 'sunburst', 'spiral', 'star', 'contemporary'];

// ---- Seeded pseudo-random (mulberry32) ---------------------------------
export class SeededRandom {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 1; }
  /** raw float in [0,1) */
  next(): number {
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min: number, max: number) { return min + this.next() * (max - min); }
  int(min: number, max: number) { return Math.floor(this.float(min, max + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  bool(p = 0.5) { return this.next() < p; }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

const SYMMETRIES = [4, 6, 8, 10, 12, 16, 24];
const PETAL_STYLES: PetalStyle[] = ['round', 'pointed', 'lotus', 'marigold', 'mixed'];
const COMPLEXITIES: Complexity[] = ['simple', 'balanced', 'intricate', 'ultra'];
const CENTERS: CenterStyle[] = ['lotus', 'floral', 'sun', 'star', 'rosette', 'geometric', 'minimal'];
const BORDERS: OuterBorder[] = ['flower', 'petal', 'dot', 'leaf', 'geometric', 'double', 'lotus'];

export interface GenerateOptions {
  patternType?: PatternType;
  paletteId?: string;
  symmetry?: number;
  petalStyle?: PetalStyle;
  complexity?: Complexity;
  density?: number; // 0..1
  surprise?: boolean;
}

// ---- Ring geometry helpers ---------------------------------------------
function buildRings(
  rng: SeededRandom,
  cfg: {
    patternType: PatternType;
    palette: Palette;
    symmetry: number;
    petalStyle: PetalStyle;
    density: number;
    complexity: Complexity;
  },
): RingSpec[] {
  const { patternType, palette, symmetry, petalStyle, density, complexity } = cfg;

  // Complexity controls how many rings and motif density.
  const ringBase = { simple: 4, balanced: 6, intricate: 8, ultra: 10 }[complexity];
  const ringCount = ringBase + Math.floor(density * 3);
  const colors = rng.shuffle(palette.colors);

  // Rings fill [outerR..0]. We allocate bands from outer→inner.
  const outerR = 0.92;
  const innerR = 0.12;
  const span = outerR - innerR;
  const bands: { lo: number; hi: number }[] = [];

  // Build band widths with mild variation so rings aren't uniformly spaced.
  const widths: number[] = [];
  let wSum = 0;
  for (let i = 0; i < ringCount; i++) {
    const base = 1 + (i === 0 ? 0.5 : 0) + (i === ringCount - 1 ? -0.2 : 0);
    const w = Math.max(0.25, base + rng.float(-0.25, 0.45));
    widths.push(w);
    wSum += w;
  }
  let cursor = outerR;
  for (let i = 0; i < ringCount; i++) {
    const w = (widths[i] / wSum) * span;
    const lo = cursor - w;
    bands.push({ lo, hi: cursor });
    cursor = lo;
  }

  // Decide a kind schedule influenced by pattern family.
  const geoChance: Record<PatternType, number> = {
    classic: 0.12, lotus: 0.08, geometric: 0.5, temple: 0.32,
    sunburst: 0.06, spiral: 0.14, star: 0.34, contemporary: 0.4,
  };
  const flowerChance: Record<PatternType, number> = {
    classic: 0.5, lotus: 0.4, geometric: 0.18, temple: 0.32,
    sunburst: 0.28, spiral: 0.3, star: 0.2, contemporary: 0.3,
  };

  const motifs: RingSpec['motif'][] = ['diamond', 'dot', 'dotTriplet', 'leaf', 'triangle', 'star'];
  const rings: RingSpec[] = [];

  bands.forEach((b, i) => {
    const ringSym = symmetry; // overall symmetry, but some rings may double it
    const roll = rng.next();
    let kind: RingSpec['kind'];
    if (roll < geoChance[patternType]) kind = 'geo';
    else if (roll < geoChance[patternType] + flowerChance[patternType]) kind = 'flower';
    else kind = 'petal';

    // Sometimes insert a thin dot ring as a divider.
    if (i > 0 && i < ringCount - 1 && rng.bool(0.18 + density * 0.2) && kind !== 'geo') {
      rings.push({
        rOuter: b.hi, rInner: b.hi - (b.hi - b.lo) * 0.28,
        kind: 'dot', count: ringSym * 2,
        color: palette.accent, rotSpeed: 0, motif: 'dot',
      });
    }

    const colA = colors[i % colors.length];
    const colB = colors[(i + 2) % colors.length];
    const mid = (b.hi + b.lo) / 2;
    const depth = b.hi - b.lo;

    const base: RingSpec = {
      rOuter: b.hi, rInner: b.lo,
      kind,
      count: ringSym,
      color: colA,
      color2: colB,
      rotSpeed: rng.float(-0.05, 0.05) * (rng.bool(0.5) ? 1 : 0),
      petalStyle: petalStyle === 'mixed' ? rng.pick(PETAL_STYLES.filter(p => p !== 'mixed')) : petalStyle,
    };

    if (kind === 'flower') {
      base.petals = rng.pick([5, 6, 8, 12]);
      base.count = Math.max(6, Math.round(ringSym * rng.float(1, 1.8)));
    } else if (kind === 'geo') {
      base.motif = rng.pick(motifs);
      base.count = ringSym;
    } else if (kind === 'petal') {
      // Petal rings can carry a spiral twist for spiral/star patterns.
      if (patternType === 'spiral') base.twist = rng.float(0.06, 0.18) * (rng.bool() ? 1 : -1);
      if (patternType === 'star') base.twist = rng.float(0.02, 0.08) * (rng.bool() ? 1 : -1);
      base.count = Math.max(8, Math.round(ringSym * rng.float(1.2, 2.2)));
    }

    // unused but keeps depth referenced for readability
    void mid; void depth;

    rings.push(base);
  });

  // Pattern-specific structural tweaks
  if (patternType === 'star') {
    // Insert a star-polygon ring near the middle.
    const midIdx = Math.floor(rings.length / 2);
    rings[midIdx] = { ...rings[midIdx], kind: 'geo', motif: 'star', count: symmetry };
  }
  if (patternType === 'temple') {
    // Emphasize geometric dividers.
    rings.forEach((r, i) => { if (i % 3 === 0 && r.kind !== 'dot') r.kind = 'geo'; });
  }
  if (patternType === 'contemporary') {
    // Fewer, larger rings — drop every other thin ring.
    return rings.filter((_, i) => i % 2 === 0 || rings[i].kind === 'dot');
  }

  return rings;
}

export function choosePalette(rng: SeededRandom, id?: string): Palette {
  if (id && id !== 'custom') return PALETTES.find(p => p.id === id) ?? PALETTES[0];
  return rng.pick(PALETTES);
}

export function choosePattern(rng: SeededRandom, id?: PatternType): PatternType {
  if (id) return id;
  return rng.pick(PATTERN_IDS);
}

export function generateConfiguration(seed: number, opts: GenerateOptions = {}): PookalamConfig {
  const rng = new SeededRandom(seed);
  const patternType = opts.surprise ? rng.pick(PATTERN_IDS) : choosePattern(rng, opts.patternType);
  const palette = opts.surprise ? rng.pick(PALETTES) : choosePalette(rng, opts.paletteId);
  const symmetry = opts.symmetry ?? rng.pick(SYMMETRIES);
  const petalStyle = opts.petalStyle ?? rng.pick(PETAL_STYLES);
  const complexity = opts.complexity ?? rng.pick(COMPLEXITIES);
  const density = opts.density ?? rng.float(0.35, 0.9);

  const rings = buildRings(rng, { patternType, palette, symmetry, petalStyle, density, complexity });

  return {
    seed,
    patternType,
    paletteId: palette.id,
    palette,
    ringCount: rings.length,
    symmetry,
    petalStyle,
    density,
    complexity,
    centerStyle: rng.pick(CENTERS),
    outerBorder: rng.pick(BORDERS),
    rotationOffset: rng.float(0, Math.PI * 2),
    rings,
    generatedAt: Date.now(),
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 999999) + 1;
}

export function getPalette(id: string): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0];
}

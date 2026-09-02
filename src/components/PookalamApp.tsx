import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, Download, RotateCcw, Flower2, Share2, Image as ImageIcon,
  Wand2, Check, Github, Compass, LayoutGrid, Info, X,
} from 'lucide-react';
import { createRenderer, type RendererHandles } from '@/pookalam/renderer';
import {
  generateConfiguration, PALETTES, PATTERN_IDS, PATTERN_LABELS,
  randomSeed, type Complexity, type PatternType, type PetalStyle,
} from '@/pookalam/generator';
import { useHistory, type HistoryEntry } from '@/hooks/useHistory';
import { Segmented, Slider, PaletteChips, InfoTip } from '@/components/Controls';

const PATTERN_OPTIONS = PATTERN_IDS.map((id) => ({ value: id, label: PATTERN_LABELS[id] }));
const PETAL_OPTIONS: { value: PetalStyle; label: string }[] = [
  { value: 'round', label: 'Round' }, { value: 'pointed', label: 'Pointed' },
  { value: 'lotus', label: 'Lotus' }, { value: 'marigold', label: 'Marigold' },
  { value: 'mixed', label: 'Mixed' },
];
const COMPLEXITY_OPTIONS: { value: Complexity; label: string }[] = [
  { value: 'simple', label: 'Simple' }, { value: 'balanced', label: 'Balanced' },
  { value: 'intricate', label: 'Intricate' }, { value: 'ultra', label: 'Ultra' },
];
const SYMMETRIES = [4, 6, 8, 10, 12, 16, 24];

type NavItem = 'explore' | 'generator' | 'designs' | 'about';
const NAV: { id: NavItem; label: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'generator', label: 'Generator', icon: Wand2 },
  { id: 'designs', label: 'My Designs', icon: LayoutGrid },
  { id: 'about', label: 'About', icon: Info },
];

export default function PookalamApp() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererHandles | null>(null);
  const { history, push } = useHistory();

  // ---- UI option state ----
  const [pattern, setPattern] = useState<PatternType>('classic');
  const [paletteId, setPaletteId] = useState('traditional');
  const [symmetry, setSymmetry] = useState(12);
  const [petalStyle, setPetalStyle] = useState<PetalStyle>('round');
  const [complexity, setComplexity] = useState<Complexity>('balanced');
  const [density, setDensity] = useState(0.6);
  const [surprise, setSurprise] = useState(false);

  // ---- Generation state ----
  const [currentConfig, setCurrentConfig] = useState(() =>
    generateConfiguration(randomSeed(), { patternType: 'classic', paletteId: 'traditional', symmetry: 12, petalStyle: 'round', complexity: 'balanced', density: 0.6 }),
  );
  const [generating, setGenerating] = useState(false);
  const [genTime, setGenTime] = useState(0);
  const [nav, setNav] = useState<NavItem>('generator');
  const [exportOpen, setExportOpen] = useState(false);
  const [shared, setShared] = useState(false);

  // ---- Mount renderer ----
  useEffect(() => {
    if (!canvasRef.current) return;
    const r = createRenderer(canvasRef.current);
    rendererRef.current = r;
    r.setConfig(currentConfig);
    return () => r.instance.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runGenerate = useCallback((opts?: { seed?: number }) => {
    if (!rendererRef.current) return;
    setGenerating(true);
    const t0 = performance.now();
    const seed = opts?.seed ?? randomSeed();
    const cfg = generateConfiguration(seed, {
      patternType: surprise ? undefined : pattern,
      paletteId: surprise ? undefined : paletteId,
      symmetry, petalStyle, complexity, density,
    });
    // push previous into history
    push(rendererRef.current.getConfig());
    rendererRef.current.setConfig(cfg);
    setCurrentConfig(cfg);
    setGenTime((performance.now() - t0) / 1000);
    window.setTimeout(() => setGenerating(false), 900);
  }, [pattern, paletteId, symmetry, petalStyle, complexity, density, surprise, push]);

  // ---- Restore from history ----
  const restore = useCallback((entry: HistoryEntry) => {
    if (!rendererRef.current) return;
    push(rendererRef.current.getConfig());
    rendererRef.current.setConfig(entry.config);
    setCurrentConfig(entry.config);
  }, [push]);

  // ---- Export actions ----
  const savePNG = (hi: boolean) => { rendererRef.current?.savePNG(hi); setExportOpen(false); };
  const copyImage = async () => {
    try {
      const url = rendererRef.current?.renderThumbnail(1024);
      if (!url) return;
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch { /* clipboard image unsupported */ }
    setExportOpen(false);
  };
  const share = async () => {
    const cfg = rendererRef.current?.getConfig();
    if (!cfg) return;
    try {
      await navigator.clipboard.writeText(
        `My Pookalam • Seed #${cfg.seed} • ${PATTERN_LABELS[cfg.patternType]} • ${cfg.palette.name}`,
      );
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch { /* noop */ }
  };

  const detailRows = useMemo(() => ([
    { label: 'Pattern', value: PATTERN_LABELS[currentConfig.patternType] },
    { label: 'Palette', value: currentConfig.palette.name },
    { label: 'Symmetry', value: `${currentConfig.symmetry}-fold` },
    { label: 'Rings', value: String(currentConfig.ringCount) },
    { label: 'Density', value: currentConfig.density > 0.66 ? 'High' : currentConfig.density > 0.4 ? 'Medium' : 'Low' },
    { label: 'Petal Style', value: cap(currentConfig.petalStyle) },
    { label: 'Complexity', value: cap(currentConfig.complexity) },
    { label: 'Seed', value: `#${currentConfig.seed}` },
    { label: 'Gen time', value: `${genTime.toFixed(2)}s` },
  ]), [currentConfig, genTime]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 antialiased">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
              <Flower2 className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight">Pookalam</span>
              <span className="hidden rounded-full bg-stone-200/80 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-stone-500 sm:inline">
                Creative Coding
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setNav(n.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  nav === n.id ? 'bg-stone-200/70 text-stone-900' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 sm:flex">
              <Github className="h-4 w-4" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-stone-700 to-stone-900 text-xs font-semibold text-white shadow-sm">
              P
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="mx-auto max-w-[1400px] px-4 pb-2 pt-7 text-center sm:pt-10">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3.5 py-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-amber-700">
            Onam • Creative Coding
          </span>
        </div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Code. Create. Celebrate.
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-stone-500 sm:text-base">
          Generate unique Kerala-inspired Pookalams through creative code.
        </p>
      </section>

      {/* ===== Workspace ===== */}
      <main className="mx-auto max-w-[1400px] px-3 pb-10 pt-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">

          {/* ----- Left: generation controls ----- */}
          <aside className="order-2 lg:order-1">
            <ControlCard title="Create your Pookalam" icon={<Wand2 className="h-4 w-4 text-amber-500" />}>
              <Field label="Pattern" tip="Structural family for the composition">
                <Segmented options={PATTERN_OPTIONS} value={pattern} onChange={setPattern} ariaLabel="Pattern" />
              </Field>

              <Field label="Color Palette" tip="Harmonious color set for the rings">
                <PaletteChips palettes={PALETTES} value={paletteId} onChange={setPaletteId} />
              </Field>

              <Field label={`Density — ${density > 0.66 ? 'High' : density > 0.4 ? 'Medium' : 'Low'}`} tip="How packed the rings are">
                <Slider value={Math.round(density * 100)} min={10} max={100} onChange={(v) => setDensity(v / 100)} label="" valueLabel={`${Math.round(density * 100)}%`} />
              </Field>

              <Field label="Symmetry" tip="Radial fold count">
                <div className="flex flex-wrap gap-1.5">
                  {SYMMETRIES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSymmetry(s)}
                      className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${
                        symmetry === s ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Petal Style" tip="Shape of individual petals">
                <Segmented options={PETAL_OPTIONS} value={petalStyle} onChange={setPetalStyle} ariaLabel="Petal style" />
              </Field>

              <Field label="Complexity" tip="Number of rings and detail level">
                <Segmented options={COMPLEXITY_OPTIONS} value={complexity} onChange={setComplexity} ariaLabel="Complexity" />
              </Field>

              <button
                onClick={() => setSurprise((s) => !s)}
                className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                  surprise ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Surprise Me {surprise ? '(on)' : ''}
              </button>
            </ControlCard>
          </aside>

          {/* ----- Center: canvas ----- */}
          <section className="order-1 lg:order-2">
            <div className="rounded-2xl border border-stone-200/80 bg-gradient-to-br from-stone-900 to-stone-950 p-3 shadow-xl sm:p-5">
              <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-xl">
                <div ref={canvasRef} className="absolute inset-0" />
                {generating && (
                  <div className="absolute inset-0 flex items-end justify-center pb-4">
                    <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-amber-100 backdrop-blur-sm">
                      Generating your Pookalam…
                    </span>
                  </div>
                )}
              </div>

              {/* Primary action bar */}
              <div className="mt-4 flex flex-col items-center gap-3">
                <button
                  onClick={() => runGenerate()}
                  disabled={generating}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-70"
                >
                  {generating ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <RotateCcw className="h-4 w-4 transition-transform group-hover:-rotate-180" />
                  )}
                  Generate New Pookalam
                </button>
                {!generating && (
                  <p className="text-[0.7rem] font-medium text-stone-400">
                    Generated • Seed #{currentConfig.seed}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ----- Right: design details ----- */}
          <aside className="order-3">
            <ControlCard title="Design Details" icon={<Info className="h-4 w-4 text-stone-500" />}>
              <dl className="space-y-2">
                {detailRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between text-xs">
                    <dt className="text-stone-400">{r.label}</dt>
                    <dd className="font-semibold text-stone-700">{r.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <ActionBtn onClick={() => runGenerate()} icon={<RotateCcw className="h-3.5 w-3.5" />} label="Regenerate" />
                <div className="relative">
                  <ActionBtn onClick={() => setExportOpen((o) => !o)} icon={<Download className="h-3.5 w-3.5" />} label="Save" />
                  {exportOpen && (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                      <ExportItem onClick={() => savePNG(false)} icon={<ImageIcon className="h-3.5 w-3.5" />} label="Download PNG" />
                      <ExportItem onClick={() => savePNG(true)} icon={<ImageIcon className="h-3.5 w-3.5" />} label="High-Res PNG" />
                      <ExportItem onClick={copyImage} icon={<Check className="h-3.5 w-3.5" />} label="Copy Image" />
                    </div>
                  )}
                </div>
                <ActionBtn onClick={share} icon={shared ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Share2 className="h-3.5 w-3.5" />} label={shared ? 'Copied' : 'Share'} />
              </div>
            </ControlCard>
          </aside>
        </div>

        {/* ===== Recent Creations ===== */}
        {history.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-stone-900">Recent Creations</h2>
              <span className="text-xs text-stone-400">{history.length} of {6} designs</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => restore(h)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-900 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <img src={h.thumb} alt={`Pookalam seed ${h.config.seed}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-3 text-left text-[0.6rem] font-medium text-amber-100">
                    #{h.config.seed} · {PATTERN_LABELS[h.config.patternType]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== Footer ===== */}
        <footer className="mt-12 border-t border-stone-200 pt-6 text-center">
          <p className="font-serif text-base tracking-[0.2em] text-stone-700">Happy Onam 🌼</p>
          <p className="mt-1 text-xs text-stone-400">Click the Pookalam to bloom • Press Space to regenerate</p>
        </footer>
      </main>

      {/* ===== Mobile nav drawer (simple) ===== */}
      {nav !== 'generator' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-6" onClick={() => setNav('generator')}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-serif text-lg font-semibold">{cap(nav)}</span>
              <button onClick={() => setNav('generator')} className="text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-stone-500">
              {nav === 'about'
                ? 'A creative coding tribute to the Kerala Onam Pookalam, built with p5.js and React. Every design is generated procedurally from a seed.'
                : nav === 'explore'
                ? 'A curated gallery of community Pookalams is coming soon. For now, generate your own and save it to My Designs.'
                : nav === 'designs'
                ? 'Your saved designs appear as thumbnails in Recent Creations below the generator. Click any thumbnail to restore it.'
                : 'Use the controls to shape your Pookalam, then generate a new variation.'}
            </p>
            <button onClick={() => setNav('generator')} className="mt-4 w-full rounded-lg bg-stone-900 py-2 text-sm font-medium text-white">
              Back to Generator
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Small presentational helpers ---------------------------------------
function ControlCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="font-serif text-base font-semibold text-stone-900">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        {tip && <InfoTip text={tip}><Info className="h-3 w-3 text-stone-300" /></InfoTip>}
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-[0.65rem] font-medium text-stone-600 transition-all hover:border-stone-300 hover:bg-stone-50"
    >
      {icon}
      {label}
    </button>
  );
}

function ExportItem({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50">
      {icon}
      {label}
    </button>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// (icons reserved for future nav surfaces)

import { useState } from 'react';
import { Check } from 'lucide-react';

/** Segmented control — premium pill-style option selector. */
export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup" aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5 rounded-xl border border-stone-200/60 bg-stone-100/70 p-1.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio" aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Custom premium slider — styled range input. */
export function Slider({
  value, min, max, step = 1, onChange, label, valueLabel,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; label: string; valueLabel?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        <span className="text-xs font-semibold text-stone-800">{valueLabel ?? value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pk-slider w-full"
        style={{ '--pk-pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

/** Palette selector with color swatches. */
export function PaletteChips({
  palettes, value, onChange,
}: {
  palettes: { id: string; name: string; colors: string[] }[];
  value: string; onChange: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {palettes.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`group flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all ${
              active ? 'border-stone-400 bg-white shadow-sm' : 'border-stone-200/70 bg-white/40 hover:border-stone-300'
            }`}
          >
            <span className="flex -space-x-1">
              {p.colors.slice(0, 4).map((c, i) => (
                <span
                  key={i}
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-white/80"
                  style={{ background: c }}
                />
              ))}
            </span>
            <span className={`truncate text-[0.7rem] font-medium ${active ? 'text-stone-900' : 'text-stone-500'}`}>
              {p.name}
            </span>
            {active && <Check className="ml-auto h-3 w-3 shrink-0 text-stone-700" />}
          </button>
        );
      })}
    </div>
  );
}

/** Tooltip wrapper — simple hover tooltip for control labels. */
export function InfoTip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2.5 py-1 text-[0.65rem] font-medium text-white shadow-lg">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
        </span>
      )}
    </span>
  );
}

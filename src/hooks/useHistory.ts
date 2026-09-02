import { useCallback, useRef, useState } from 'react';
import { generateConfiguration, randomSeed, type PookalamConfig } from '@/pookalam/generator';
import { renderThumbnail } from '@/pookalam/renderer';

export interface HistoryEntry {
  id: string;
  config: PookalamConfig;
  thumb: string;
}

const MAX_HISTORY = 6;

/** In-memory design history with lazy thumbnail generation. */
export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const pending = useRef<Set<string>>(new Set());

  const push = useCallback((config: PookalamConfig) => {
    const id = `${config.seed}-${config.generatedAt}`;
    if (pending.current.has(id)) return;
    pending.current.add(id);
    // Defer thumbnail so it never blocks the generate click.
    setTimeout(() => {
      const thumb = renderThumbnail(config, 180);
      setHistory((prev) => {
        const next = [{ id, config, thumb }, ...prev].slice(0, MAX_HISTORY);
        pending.current.delete(id);
        return next;
      });
    }, 60);
  }, []);

  return { history, push };
}

export { randomSeed };
export type GenerateOptions = Parameters<typeof generateConfiguration>[1];

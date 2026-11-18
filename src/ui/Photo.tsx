import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cachedThumb, SMALL, thumbUrl } from '../thumbs';
import { gridColumns } from '../logic/layout';
import { tapLight } from './haptics';
import { VideoBadge, usePlayer } from './play';

/** A photo's thumbnail, loaded on demand; the empty tint until it is there. */
export function useThumb(id: string | undefined, size: number): string | undefined {
  const [state, setState] = useState<{ k: string; url?: string }>(() => ({ k: `${id}|${size}`, url: id ? cachedThumb(id, size) : undefined }));
  const k = `${id}|${size}`;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    const have = cachedThumb(id, size);
    if (have) { setState({ k, url: have }); return; }
    thumbUrl(id, size).then(url => { if (alive) setState({ k, url }); }).catch(() => {});
    return () => { alive = false; };
  }, [id, size, k]);
  return state.k === k ? state.url : id ? cachedThumb(id, size) : undefined;
}

export function Thumb({ id, size = SMALL, className = '', alt = '' }: { id: string; size?: number; className?: string; alt?: string }) {
  const url = useThumb(id, size);
  return url
    ? <img src={url} alt={alt} draggable={false} decoding="async" className={`photo w-full h-full ${className}`} />
    : <span role={alt ? 'img' : undefined} aria-label={alt || undefined} className={`photo block w-full h-full ${className}`} />;
}

/**
 * A grid of photos for any number of them: only the rows on screen (and a
 * few around) are in the DOM, positioned absolutely in a box as tall as all
 * rows. Scrolls with the page, like every screen here. `columns` is the
 * count on a phone (logic/layout.ts: a grid of four shows three on the
 * narrowest phones).
 */
export function PhotoGrid({ ids, columns = 3, gap = 4, label, onOpen, overlay, selected, onSelect, selectLabel }: {
  ids: string[];
  columns?: number;
  gap?: number;
  /** What VoiceOver reads for a tile (its date). */
  label: (id: string) => string;
  onOpen?: (id: string) => void;
  /** A badge or veil over a tile. */
  overlay?: (id: string) => React.ReactNode;
  /** With these, every tile gets a select circle of its own (top start), beside opening it. */
  selected?: ReadonlySet<string>;
  onSelect?: (id: string) => void;
  /** What VoiceOver reads for a tile's select circle. */
  selectLabel?: (id: string) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [range, setRange] = useState<[number, number]>([0, 12]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const cols = gridColumns(width, columns);
  const cell = width > 0 ? (width - gap * (cols - 1)) / cols : 0;
  const rowH = cell + gap;
  const rows = Math.ceil(ids.length / cols);

  useEffect(() => {
    if (!rowH) return;
    const on = () => {
      const top = box.current?.getBoundingClientRect().top ?? 0;
      const first = Math.max(0, Math.floor(-top / rowH) - 4);
      const last = Math.min(rows, Math.ceil((window.innerHeight - top) / rowH) + 4);
      setRange(r => (r[0] === first && r[1] === last ? r : [first, last]));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [rowH, rows]);

  // A video in a grid that opens nothing else plays when tapped, inside the app.
  const player = usePlayer();
  const tiles: React.ReactNode[] = [];
  if (cell > 0) {
    for (let r = range[0]; r < range[1]; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= ids.length) break;
        const id = ids[i];
        const style: React.CSSProperties = { position: 'absolute', top: r * rowH, insetInlineStart: c * (cell + gap), width: cell, height: cell };
        const ms = onOpen ? null : player?.length(id) ?? null;
        const open = onOpen ?? (ms !== null ? player!.play : undefined);
        const inner = <><Thumb id={id} />{overlay?.(id)}{ms !== null && <VideoBadge ms={ms} />}</>;
        const on = !!selected?.has(id);
        tiles.push(open && onSelect ? (
          // A tile that opens and can be selected: two buttons side by side in one square, never one inside the other.
          <div key={id} style={style} className={`overflow-hidden rounded-[8px] ${on ? 'ring-[3px] ring-inset ring-accent' : ''}`}>
            <button type="button" aria-label={ms !== null ? `${label(id)}, ${player!.label(id)}` : label(id)}
              onClick={() => { tapLight(); open(id); }}
              className="absolute inset-0 block overflow-hidden press focus-visible:ring-focus">
              {inner}
            </button>
            <button type="button" aria-pressed={on} aria-label={selectLabel?.(id) ?? label(id)}
              onClick={() => { tapLight(); onSelect(id); }}
              className="absolute top-0 start-0 w-12 h-12 inline-flex items-start justify-start p-1.5 focus-visible:ring-focus rounded-[8px]">
              <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center ${on ? 'bg-accent-fill text-accent-fill-ink' : 'bg-veil ring-2 ring-inset ring-on-color'}`} aria-hidden="true">
                {on && <Check className="w-4 h-4" strokeWidth={3.2} />}
              </span>
            </button>
          </div>
        ) : open ? (
          <button key={id} type="button" style={style} aria-label={ms !== null ? `${label(id)}, ${player!.label(id)}` : label(id)}
            onClick={() => { tapLight(); open(id); }}
            className="block overflow-hidden rounded-[8px] press focus-visible:ring-focus">
            {inner}
          </button>
        ) : (
          <div key={id} style={style} role="img" aria-label={label(id)} className="overflow-hidden rounded-[8px]">{inner}</div>
        ));
      }
    }
  }
  return <div ref={box} className="relative w-full" style={{ height: Math.max(0, rows * rowH - gap) }}>{tiles}</div>;
}

/** Up to four photos as one cover: one large, or a mosaic. */
export function Mosaic({ ids, className = '' }: { ids: string[]; className?: string }) {
  const four = ids.length >= 4 ? [ids[0], ids[Math.floor(ids.length / 3)], ids[Math.floor((2 * ids.length) / 3)], ids[ids.length - 1]] : ids.slice(0, 1);
  if (four.length === 1) return <div className={`overflow-hidden ${className}`}><Thumb id={four[0]} /></div>;
  return (
    <div className={`grid grid-cols-2 grid-rows-2 gap-[2px] overflow-hidden ${className}`}>
      {four.map(id => <Thumb key={id} id={id} className="!rounded-none" />)}
    </div>
  );
}

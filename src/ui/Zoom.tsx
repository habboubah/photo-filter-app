import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { Archive, Images, X, ZoomIn, ZoomOut } from 'lucide-react';
import { LARGE, ZOOM } from '../thumbs';
import { useThumb } from './Photo';
import { useDialog } from './useDialog';
import { tapLight } from './haptics';

/** How far a tap zooms in. */
const SCALE = 2.6;

/** The id two pictures of one photo share, so the photo grows from its place into the viewer and back (motion's layoutId). */
export const zoomLayoutId = (id: string) => `zoom-${id}`;

/**
 * A photo large, over the whole screen, to check what a thumbnail hides — is
 * it sharp, are the eyes open. A tap zooms in on the spot tapped (and out
 * again); zoomed in, a drag moves the photo. The picture grows out of the
 * tile it was opened from (a shared element) and goes back into it. Closed
 * by its button, Escape, the system's back or a tap beside the photo. Asks for a larger picture
 * than the review shows, and shows that one until it is there. `onLike`
 * adds *Ähnliche Fotos zeigen* at its foot (from a review: it left the
 * review's card on 18 November 2026, to keep the busiest screen calm).
 */
export function ZoomView({ id, alt, labels, onClose, onLike, action, windowed }: {
  id: string;
  /** What the photo is, for screen readers (its date). */
  alt: string;
  labels: { close: string; zoomIn: string; zoomOut: string; hint: string; like?: string };
  onClose: () => void;
  /** Every photo like this one (Ähnliche Fotos), shown with `labels.like`. */
  onLike?: () => void;
  /** *Löschen vormerken* for this photo, red with the archive (src/ui/pick.tsx, MarkButton). */
  action?: { label: string; onClick: () => void };
  /**
   * A window over the dimmed page instead of the whole screen (a photo opened
   * from a grid, src/ui/pick.tsx Opened: the page stays in view — Ahmad,
   * 19 November 2026). A tap on the dimmed page closes it.
   */
  windowed?: boolean;
}) {
  const reduce = useReducedMotion();
  const large = useThumb(id, LARGE);
  const sharp = useThumb(id, ZOOM);
  const url = sharp ?? large;
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  useDialog(true, panel, onClose);
  const [zoomed, setZoomed] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const [limit, setLimit] = useState({ x: 0, y: 0 });
  const spring = reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 } as const;

  /** Zooms in on a point of the stage (its middle without one), or back out. */
  const toggle = (at?: { x: number; y: number }) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    tapLight();
    if (zoomed) {
      void animate(scale, 1, spring); void animate(x, 0, spring); void animate(y, 0, spring);
      setZoomed(false);
      return;
    }
    // How far the picture may be moved once it is larger than the stage, and where to put it so the tapped spot stays under the finger.
    const max = { x: (box.width * (SCALE - 1)) / 2, y: (box.height * (SCALE - 1)) / 2 };
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    const to = at ? { x: clamp((box.left + box.width / 2 - at.x) * (SCALE - 1), max.x), y: clamp((box.top + box.height / 2 - at.y) * (SCALE - 1), max.y) } : { x: 0, y: 0 };
    setLimit(max);
    void animate(scale, SCALE, spring); void animate(x, to.x, spring); void animate(y, to.y, spring);
    setZoomed(true);
  };

  /** A point on the stage but beside the picture (object-contain leaves bands around it). */
  const beside = (at: { x: number; y: number }) => {
    const box = stage.current?.getBoundingClientRect();
    const el = img.current;
    if (!box || !el || !el.naturalWidth || !el.naturalHeight) return false;
    const k = Math.min(box.width / el.naturalWidth, box.height / el.naturalHeight);
    const w = el.naturalWidth * k, h = el.naturalHeight * k;
    const left = box.left + (box.width - w) / 2, top = box.top + (box.height - h) / 2;
    return at.x < left || at.x > left + w || at.y < top || at.y > top + h;
  };
  /** A tap on the page itself, not on a control: closes, as a tap beside the photo does (Ahmad, 19 November 2026). */
  const outside = (e: React.MouseEvent) => { if (e.target === e.currentTarget) { tapLight(); onClose(); } };

  // The system's pinch would zoom the whole page behind the viewer: the viewer zooms itself.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('gesturestart', stop);
    return () => el.removeEventListener('gesturestart', stop);
  }, []);

  return createPortal(
    <motion.div
      ref={panel} role="dialog" aria-modal="true" aria-label={alt}
      className={windowed
        ? 'fixed inset-0 z-[58] flex items-center justify-center px-page safe-top pb-safe-8'
        : 'fixed inset-0 z-[58] flex flex-col bg-bg [&>*]:w-full [&>*]:max-w-column [&>*]:mx-auto'}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      {windowed && <div className="absolute inset-0 scrim opacity-60" onClick={() => { tapLight(); onClose(); }} aria-hidden="true" />}
      <div className={windowed
        ? 'relative w-full max-w-column h-[min(78vh,44rem)] flex flex-col rounded-xl glass-clear overflow-hidden'
        : 'contents'}>
      <div onClick={outside} className={`relative z-10 px-[12px] min-h-[54px] pt-1 flex items-center justify-between gap-2 ${windowed ? 'pt-3' : 'safe-top'}`}>
        <button
          type="button" onClick={() => { tapLight(); onClose(); }} aria-label={labels.close} title={labels.close}
          className="h-12 w-12 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
        >
          <X className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          type="button" onClick={() => toggle()} aria-label={zoomed ? labels.zoomOut : labels.zoomIn} title={zoomed ? labels.zoomOut : labels.zoomIn} aria-pressed={zoomed}
          className="h-12 w-12 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
        >
          {zoomed ? <ZoomOut className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" /> : <ZoomIn className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
        </button>
      </div>
      <div ref={stage} className="relative flex-1 min-h-0 overflow-hidden touch-none">
        <motion.div
          layoutId={reduce ? undefined : zoomLayoutId(id)}
          className={`absolute inset-0 ${zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
          style={{ x, y, scale }}
          drag={zoomed}
          dragConstraints={{ left: -limit.x, right: limit.x, top: -limit.y, bottom: limit.y }}
          dragElastic={0.12}
          onTap={(e, info) => {
            // Beside the picture closes; on it zooms in (and out again).
            const at = 'clientX' in e ? { x: e.clientX, y: e.clientY } : info.point;
            if (!zoomed && beside(at)) { tapLight(); onClose(); } else toggle(info.point);
          }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        >
          {url && <img ref={img} src={url} alt={alt} draggable={false} decoding="async" className="absolute inset-0 w-full h-full object-contain" />}
        </motion.div>
      </div>
      <div onClick={outside} className={`relative z-10 px-6 pt-3 flex flex-col items-center gap-2 ${windowed ? 'pb-4' : 'pb-safe-8'}`}>
        {onLike && labels.like && (
          <button
            type="button" onClick={() => { tapLight(); onLike(); }}
            className="min-h-tap px-4 inline-flex items-center gap-2 rounded-full glass text-label font-bold text-fg press focus-visible:ring-focus"
          >
            <Images className="w-5 h-5" aria-hidden="true" />{labels.like}
          </button>
        )}
        {action && (
          <button
            type="button" onClick={() => { tapLight(); action.onClick(); }}
            className="min-h-tap px-5 inline-flex items-center gap-2 rounded-full bg-neg text-neg-ink sheen text-label font-bold press focus-visible:ring-focus"
          >
            <Archive className="w-5 h-5" aria-hidden="true" />{action.label}
          </button>
        )}
        <p className={`text-caption text-center ${windowed ? 'px-3 py-1 rounded-full glass text-fg' : 'text-fg-mute'}`} aria-hidden="true">{labels.hint}</p>
      </div>
      </div>
    </motion.div>,
    document.body,
  );
}

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { Images, X, ZoomIn, ZoomOut } from 'lucide-react';
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
 * by its button, Escape or the system's back. Asks for a larger picture
 * than the review shows, and shows that one until it is there. `onLike`
 * adds *Ähnliche Fotos zeigen* at its foot (from a review: it left the
 * review's card on 18 November 2026, to keep the busiest screen calm).
 */
export function ZoomView({ id, alt, labels, onClose, onLike }: {
  id: string;
  /** What the photo is, for screen readers (its date). */
  alt: string;
  labels: { close: string; zoomIn: string; zoomOut: string; hint: string; like?: string };
  onClose: () => void;
  /** Every photo like this one (Ähnliche Fotos), shown with `labels.like`. */
  onLike?: () => void;
}) {
  const reduce = useReducedMotion();
  const large = useThumb(id, LARGE);
  const sharp = useThumb(id, ZOOM);
  const url = sharp ?? large;
  const panel = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
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
      className="fixed inset-0 z-[58] flex flex-col bg-bg"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <div className="relative z-10 safe-top px-[12px] min-h-[54px] pt-1 flex items-center justify-between gap-2">
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
          onTap={(_, info) => toggle(info.point)}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        >
          {url && <img src={url} alt={alt} draggable={false} decoding="async" className="absolute inset-0 w-full h-full object-contain" />}
        </motion.div>
      </div>
      <div className="relative z-10 px-6 pt-3 pb-safe-8 flex flex-col items-center gap-2">
        {onLike && labels.like && (
          <button
            type="button" onClick={() => { tapLight(); onLike(); }}
            className="min-h-tap px-4 inline-flex items-center gap-2 rounded-full glass text-label font-bold text-fg press focus-visible:ring-focus"
          >
            <Images className="w-5 h-5" aria-hidden="true" />{labels.like}
          </button>
        )}
        <p className="text-caption text-fg-mute text-center" aria-hidden="true">{labels.hint}</p>
      </div>
    </motion.div>,
    document.body,
  );
}

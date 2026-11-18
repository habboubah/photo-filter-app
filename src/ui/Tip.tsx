import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { tapLight } from './haptics';

/** After a screen appears, and between two tips: nobody reads a hint that arrives with the screen, or two in a row. */
const FIRST_MS = 900;
const GAP_MS = 4000;
/** The gap between the bubble and its control, and the bubble's margin to the screen's edge. */
const GAP = 10;
const EDGE = 12;

interface Box { top: number; left: number; width: number; height: number }

/**
 * A tip: one short sentence in a small bubble that points at a real
 * control — the element marked `data-tip="<id>"`. It never blocks: nothing
 * dims, the screen stays usable, a tap on the bubble (or using the control)
 * sends it away for good. Screen readers hear it as a polite status; its
 * button says "Verstanden". It waits for its control to be on screen and
 * hides while the control is scrolled away.
 *
 * `TipHost` is the queue: it is given the one tip that is due (App.tsx picks
 * it with src/logic/firstRun.ts `nextTip`) and adds the pauses.
 */
export function TipHost({ tip, label, gotIt, onSeen }: {
  /** The tip that is due on this screen, or null. A new `id` starts a new wait. */
  tip: { id: string; text: string } | null;
  /** "Tipp", read before the sentence. */
  label: string;
  gotIt: string;
  onSeen: (id: string) => void;
}) {
  const [shown, setShown] = useState<string | null>(null);
  const lastGone = useRef(0);
  const id = tip?.id ?? null;
  useEffect(() => {
    setShown(null);
    if (!id) return;
    const wait = Math.max(FIRST_MS, lastGone.current + GAP_MS - Date.now());
    const timer = window.setTimeout(() => setShown(id), wait);
    return () => window.clearTimeout(timer);
  }, [id]);
  const dismiss = () => {
    if (!tip) return;
    lastGone.current = Date.now();
    setShown(null);
    onSeen(tip.id);
  };
  return createPortal(
    <AnimatePresence>
      {tip && shown === tip.id && <Bubble key={tip.id} id={tip.id} text={tip.text} label={label} gotIt={gotIt} onDismiss={dismiss} />}
    </AnimatePresence>,
    document.body,
  );
}

function Bubble({ id, text, label, gotIt, onDismiss }: { id: string; text: string; label: string; gotIt: string; onDismiss: () => void }) {
  const [box, setBox] = useState<Box | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  // Where the control is — looked up again while it may still be arriving (a lazy screen, a list filling in), and on every scroll or resize.
  useEffect(() => {
    let target: Element | null = null;
    const used = () => dismiss.current();
    const measure = () => {
      const el = document.querySelector(`[data-tip="${id}"]`);
      if (el !== target) {
        target?.removeEventListener('click', used);
        target = el;
        // Using the control is the best way to have understood the tip.
        target?.addEventListener('click', used);
      }
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      // A tall control (a list, a photo card) is pointed at by its head, so the bubble sits on it instead of far below.
      const height = Math.min(r.height, 72);
      const visible = r.width > 0 && r.top + height > 60 && r.top < window.innerHeight - 120;
      setBox(b => (!visible ? null : b && b.top === r.top && b.left === r.left && b.width === r.width && b.height === height ? b : { top: r.top, left: r.left, width: r.width, height }));
    };
    measure();
    const poll = window.setInterval(measure, 400);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      target?.removeEventListener('click', used);
    };
  }, [id]);

  useLayoutEffect(() => {
    const el = bubble.current;
    if (el) setSize(s => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }));
  });

  if (!box) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(340, vw - 2 * EDGE);
  const centre = box.left + box.width / 2;
  const left = Math.max(EDGE, Math.min(vw - EDGE - width, centre - width / 2));
  // Below its control when there is room, else above — never over it.
  const below = box.top + box.height + GAP + (size.h || 132) < vh - 24;
  const top = below ? box.top + box.height + GAP : Math.max(EDGE, box.top - GAP - (size.h || 132));
  const arrow = Math.max(22, Math.min(width - 22, centre - left));

  return (
    <motion.div
      ref={bubble}
      role="status" aria-live="polite"
      onClick={() => { tapLight(); onDismiss(); }}
      className="fixed z-[45] rounded-[20px] bg-surface shadow-e2 ring-1 ring-hairline"
      style={{ top, left, width }}
      initial={{ opacity: 0, y: below ? -6 : 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* The pointer: a small square of the bubble's own colour, turned, at the control's middle. */}
      <span
        aria-hidden="true"
        className={`absolute w-3.5 h-3.5 rotate-45 bg-surface ${below ? '-top-[6px] shadow-[-1px_-1px_0_var(--t-hairline)]' : '-bottom-[6px] shadow-[1px_1px_0_var(--t-hairline)]'}`}
        style={{ left: arrow - 7 }}
      />
      <div className="relative ps-4 pe-2 pt-1 pb-1">
        <div className="flex items-start gap-3 pe-2">
          <span className="mt-2.5 w-7 h-7 shrink-0 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center" aria-hidden="true">
            <Lightbulb className="w-4 h-4" strokeWidth={2.3} />
          </span>
          <p className="min-w-0 flex-1 pt-2.5 text-label text-fg wrap-prose"><span className="sr-only">{label}: </span>{text}</p>
        </div>
        <div className="flex justify-end">
          <button
            type="button" onClick={e => { e.stopPropagation(); tapLight(); onDismiss(); }}
            className="min-h-[48px] px-4 rounded-full text-label font-bold text-accent active:bg-accent-dim press focus-visible:ring-focus"
          >
            {gotIt}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

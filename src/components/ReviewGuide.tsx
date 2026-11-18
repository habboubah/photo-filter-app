import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Pointer, X } from 'lucide-react';
import type { Gesture } from '../logic/firstRun';
import { GESTURES } from '../logic/firstRun';
import type { Decision } from '../logic/review';
import { Strings, fmt, num } from '../translations';
import { tapLight } from '../ui/haptics';

/** The gesture each decision is (deciding later is a button, not a gesture). */
export const GESTURE_OF: Record<Decision, Gesture | null> = { keep: 'swipeRight', delete: 'swipeLeft', later: null };

/** What the guided review needs from App.tsx: the gesture to teach now, and what to tell it. */
export interface Guide {
  /** The gesture hinted on the current card, or null once both were done. */
  gesture: Gesture | null;
  /** The user made this decision — by a swipe, a button or a key: its gesture counts as learned. */
  onDid: (g: Gesture) => void;
  /** "Hinweise ausblenden": both count as learned. */
  onSkip: () => void;
}

/** What a decision is called right after it was made, while the guide runs. */
export function saidFor(t: Strings, d: Decision): string {
  return d === 'keep' ? t.guideDidKeep : d === 'delete' ? t.guideDidAside : t.guideDidLater;
}

/**
 * The guided review's hint over the first real cards: a hand that makes the
 * gesture — right keeps, left marks for deletion — and
 * says so in words, one gesture per card until the user has done it once.
 * It lies over the card without taking a touch (only its small close button
 * does), disappears the moment the card is touched, and is a still arrow
 * with the same words under reduced motion. Physical, like the swipe: left
 * is left in every language.
 */
export function GestureHint({ t, gesture, hidden, onSkip }: { t: Strings; gesture: Gesture; hidden: boolean; onSkip: () => void }) {
  const reduce = useReducedMotion();
  const words = gesture === 'swipeRight' ? t.guideRight : t.guideLeft;
  const Arrow = gesture === 'swipeRight' ? ArrowRight : ArrowLeft;
  const to = gesture === 'swipeRight' ? { x: 84, y: 0, rotate: 8 } : { x: -84, y: 0, rotate: -8 };
  const step = GESTURES.indexOf(gesture) + 1;
  return (
    <motion.div
      dir="ltr"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }} animate={{ opacity: hidden ? 0 : 1 }} transition={{ duration: 0.18 }}
    >
      {/* The hand: one slow pass in the gesture's direction, a pause, again. */}
      <span className="relative w-[220px] h-[220px] flex items-center justify-center" aria-hidden="true">
        {reduce ? (
          <span className="w-16 h-16 rounded-full glass text-fg inline-flex items-center justify-center"><Arrow className="w-8 h-8" strokeWidth={2.4} /></span>
        ) : (
          <motion.span
            className="w-16 h-16 rounded-full glass text-fg inline-flex items-center justify-center"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            animate={{ x: [0, 0, to.x, to.x], y: [0, 0, to.y, to.y], rotate: [0, 0, to.rotate, to.rotate], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.9, times: [0, 0.18, 0.72, 1], ease: [0.32, 0.72, 0, 1], repeat: Infinity, repeatDelay: 0.5 }}
          >
            <Pointer className="w-7 h-7" strokeWidth={2.2} />
          </motion.span>
        )}
      </span>
      <div dir={t.dir} className="absolute bottom-12 inset-x-3 flex justify-center">
        <div className="max-w-full inline-flex items-center gap-1 ps-4 pe-1 py-1 rounded-[24px] glass text-fg">
          <span className="min-w-0 py-1.5">
            <span className="block text-micro font-bold text-fg-mute num">{fmt(t.guideStep, { i: num(t, step), n: num(t, GESTURES.length) })}</span>
            <span className="block text-label font-bold wrap-compound">{words}</span>
          </span>
          <button
            type="button" aria-label={t.guideSkip} title={t.guideSkip}
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={() => { tapLight(); onSkip(); }}
            className="pointer-events-auto shrink-0 w-12 h-12 rounded-full inline-flex items-center justify-center text-fg-mute active:bg-surface-2 press focus-visible:ring-focus"
          >
            <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

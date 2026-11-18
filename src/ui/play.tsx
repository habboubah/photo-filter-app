import { createContext, useContext, useEffect, useState } from 'react';
import { Loader2, Play, X } from 'lucide-react';
import { duration } from '../logic/large';
import { tapLight } from './haptics';

/**
 * Playing a video inside the app, from wherever its picture is shown: a grid
 * tile, the sheet of a large file, a series of similar videos, the review
 * card. App.tsx provides it. A big picture of a video (`<PlayOver>`) plays it
 * right there, in the picture's own box, with the WebView's controls
 * (`source` → `PhotoLibrary.videoFile`); a grid tile, or a video the page
 * can't play, opens the native window (`play`: iPhone AVPlayerViewController,
 * Android a VideoView) — never another app. A play triangle points right in Arabic too (media controls
 * don't mirror).
 */
export interface Player {
  /** The video's length in ms, or null for a photo. */
  length: (id: string) => number | null;
  play: (id: string) => void;
  /** A URL the page can play this video from, in place (rejects when it can't). */
  source?: (id: string) => Promise<string>;
  /** The label of the button that stops a video playing in place. */
  stopLabel?: string;
  /** What VoiceOver reads for the play button ("Video abspielen, 0:42"). */
  label: (id: string) => string;
}

export const PlayerContext = createContext<Player | null>(null);
export const usePlayer = () => useContext(PlayerContext);

/** The small chip on a tile: ▶ and the length. */
export function VideoBadge({ ms }: { ms: number }) {
  return (
    <span aria-hidden="true" className="absolute top-1.5 end-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num pointer-events-none">
      <Play className="w-3 h-3" fill="currentColor" strokeWidth={0} />{duration(ms)}
    </span>
  );
}

/**
 * The round play button over a large picture of a video (nothing for a
 * photo). It plays the video in place: a <video> with controls fills the box
 * the picture is in (its parent must be `relative`), and ✕ goes back to the
 * picture. Pointer events stop here, so a review card under it does not
 * swipe. If the page can't play the file, the native window opens instead.
 */
export function PlayOver({ id, className }: { id: string; className?: string }) {
  const player = usePlayer();
  const [state, setState] = useState<'idle' | 'loading' | { src: string }>('idle');
  useEffect(() => setState('idle'), [id]);
  if (!player || player.length(id) === null) return null;
  const fallback = () => { setState('idle'); player.play(id); };
  const start = () => {
    tapLight();
    if (!player.source) { player.play(id); return; }
    setState('loading');
    player.source(id).then(src => setState(s => s === 'loading' ? { src } : s), fallback);
  };
  if (typeof state === 'object') {
    return (
      <div className="absolute inset-0 z-10 bg-black" onPointerDownCapture={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <video
          key={state.src} src={state.src} controls autoPlay playsInline
          aria-label={player.label(id)}
          onError={fallback}
          className="w-full h-full object-contain"
        />
        <button
          type="button" aria-label={player.stopLabel ?? 'Close'} title={player.stopLabel}
          onClick={() => setState('idle')}
          className="absolute top-2 end-2 w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
        >
          <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button" aria-label={player.label(id)} aria-busy={state === 'loading'}
      onPointerDownCapture={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); if (state === 'idle') start(); }}
      className={`absolute inset-0 m-auto w-[72px] h-[72px] rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus ${className ?? ''}`}
    >
      {state === 'loading'
        ? <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        : <Play className="w-8 h-8 translate-x-[2px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />}
    </button>
  );
}

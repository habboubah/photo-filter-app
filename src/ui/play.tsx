import { createContext, useContext } from 'react';
import { Play } from 'lucide-react';
import { duration } from '../logic/large';
import { tapLight } from './haptics';

/**
 * Playing a video inside the app, from wherever its picture is shown: a grid
 * tile, the sheet of a large file, a series of similar videos, the review
 * card. App.tsx provides it; the native plugins play the file over the app
 * (iPhone AVPlayerViewController, Android a full-screen VideoView) — never in
 * another app. A play triangle points right in Arabic too (media controls
 * don't mirror).
 */
export interface Player {
  /** The video's length in ms, or null for a photo. */
  length: (id: string) => number | null;
  play: (id: string) => void;
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

/** The round play button over a large picture of a video (nothing for a photo). */
export function PlayOver({ id }: { id: string }) {
  const player = usePlayer();
  if (!player || player.length(id) === null) return null;
  return (
    <button
      type="button" aria-label={player.label(id)}
      onPointerDownCapture={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); tapLight(); player.play(id); }}
      className="absolute inset-0 m-auto w-[72px] h-[72px] rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
    >
      <Play className="w-8 h-8 translate-x-[2px]" fill="currentColor" strokeWidth={0} aria-hidden="true" />
    </button>
  );
}

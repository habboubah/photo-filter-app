import type { GroupKind, Photo } from '../types';

/*
 * Why the app suggests keeping one photo of a group, in words a parent
 * understands — said only as far as the facts carry it. It reads the same
 * facts the ranking used (src/logic/best.ts rankGroup, rankDuplicates) and
 * names the one that decided, when one clearly did:
 *
 *   favourite   a favourite in the system's Photos / Gallery
 *   protected   protected in the app (it ranks like a favourite)
 *   burstPick   a burst's chosen frame
 *   edited      the only edited copy (duplicates)
 *   place       the only copies that know where they were taken (duplicates)
 *   largest     the most pixels (duplicates: a messenger copy is smaller)
 *   sharpest    the sharpest of the series (similar shots)
 *   original    duplicates where nothing above decides (the oldest)
 *   balance     similar shots where no single signal decides: sharpness and
 *               light together (and faces where the phone scored them)
 *   bestTake    lookalike videos (no single signal to name)
 *
 * Nothing here changes what is suggested; it only explains it.
 */
export type KeeperWhy = 'favourite' | 'protected' | 'burstPick' | 'edited' | 'place' | 'largest' | 'sharpest' | 'original' | 'balance' | 'bestTake';

const px = (p: Photo) => p.w * p.h;

/** Why `keeper` is the one the app suggests among `members` (the group, keeper included). `isProtected`: kept by the user in the app. */
export function keeperWhy(kind: GroupKind, keeper: Photo, members: Photo[], isProtected = false): KeeperWhy {
  const others = members.filter(p => p.id !== keeper.id);
  if (keeper.fav) return 'favourite';
  if (isProtected) return 'protected';
  if (kind === 'lookalike') return 'bestTake';
  if (kind === 'duplicate') {
    if (keeper.edited && others.every(p => !p.edited)) return 'edited';
    if (keeper.lat !== undefined && others.some(p => p.lat === undefined)) return 'place';
    if (others.length && others.every(p => px(p) < px(keeper))) return 'largest';
    return 'original';
  }
  if (keeper.pick && keeper.burst && others.some(p => p.burst === keeper.burst)) return 'burstPick';
  if (keeper.sharp !== undefined && others.length && others.every(p => p.sharp !== undefined && p.sharp < keeper.sharp!)) return 'sharpest';
  return 'balance';
}

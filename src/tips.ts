import type { TipSpec } from './logic/firstRun';
import type { Strings } from './translations';

/*
 * Every tip of the app, in one list: a one-time hint the first time a
 * feature is on screen, pointing at the real control (the element marked
 * `data-tip="<id>"`). Shown one at a time by the one host in App.tsx
 * (src/ui/Tip.tsx), in this order within a screen; dismissed with a tap,
 * never blocking, replayable from Einstellungen › So funktioniert Bildklar.
 * No screen builds a hint of its own: add it here and mark its control.
 *
 * `screen` is App.tsx's screen key. `when` names a moment App.tsx reports
 * (the gestures are learned, something is marked …); without it a tip is
 * due as soon as its screen and control are there.
 */
export interface TipDef extends TipSpec { text: (t: Strings) => string }

export const TIPS: TipDef[] = [
  // A review, once the three gestures were done: the buttons and undo, then what a suggestion is.
  { id: 'tip.buttons', screen: 'review', when: 'gesturesLearned', text: t => t.tipButtons },
  { id: 'tip.suggest', screen: 'review', when: 'suggestionShown', text: t => t.tipSuggest },
  // Home, once something was marked: where it waits.
  { id: 'tip.bin', screen: 'home-clean', when: 'somethingMarked', text: t => t.tipBin },
  { id: 'tip.binScreen', screen: 'bin', text: t => t.tipBinScreen },
  { id: 'tip.group', screen: 'group', text: t => t.tipGroup },
  { id: 'tip.quickClean', screen: 'quickClean', text: t => t.tipQuick },
  { id: 'tip.months', screen: 'months', text: t => t.tipMonths },
  { id: 'tip.trips', screen: 'home-organize', text: t => t.tipTrips },
  { id: 'tip.widget', screen: 'home-organize', text: t => t.tipWidget },
  { id: 'tip.search', screen: 'search', text: t => t.tipSearch },
  { id: 'tip.reminder', screen: 'settings', text: t => t.tipReminder },
];

/** Every tip's id, to show them all again. */
export const TIP_IDS = TIPS.map(x => x.id);

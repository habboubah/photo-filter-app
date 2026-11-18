import { useEffect, useRef } from 'react';
import type { CleanupSummary, Storage } from './types';
import { PhotoLibrary } from './native/photoLibrary';
import { type Language, type Strings, bytes, fmt, percent, plural } from './translations';

/*
 * The home-screen and Lock Screen widgets (split out of App.tsx on
 * 18 November 2026): what they show is sent to the native side, which writes
 * it where the widget reads it — again only when it changes.
 */
export function useWidget({ t, language, ready, summary, today, storage, pct }: {
  t: Strings;
  language: Language;
  /** The facts are loaded. */
  ready: boolean;
  summary: CleanupSummary | null;
  /** "On this day": its photos (the first is the widget's) and the years. */
  today: { ids: string[]; years: number[] };
  storage: Storage | null;
  /** The share gone through month by month. */
  pct: number;
}) {
  // The home-screen widget shows "On this day" (with its first photo) or the space that could be freed;
  // sent again only when what it shows changes.
  const widgetSent = useRef('');
  useEffect(() => {
    if (!ready || !summary) return;
    const data = today.ids.length
      ? {
        title: t.onThisDay,
        line: fmt(t.onThisDayBody, { photos: plural(t, 'photos', today.ids.length), years: today.years.map(y => String(y)).join(', ') }),
        photoId: today.ids[0],
      }
      : {
        title: summary.total.count ? t.cleanupCard : t.cleanupNone,
        // With nothing to clean up, the progress figure says something instead (when there is one).
        line: [summary.total.count ? bytes(t, summary.total.bytes) : pct > 0 ? fmt(t.widgetProgress, { pct: percent(t, pct) }) : null,
          storage ? fmt(t.storageValue, { free: bytes(t, storage.free), total: bytes(t, storage.total) }) : null].filter(Boolean).join(' · '),
      };
    // The Lock Screen widget (iPhone): the space that could be freed and the share gone through.
    const lock = { freeable: summary.total.bytes, pct };
    const key = JSON.stringify({ ...data, ...lock });
    if (key === widgetSent.current) return;
    const timer = window.setTimeout(() => {
      widgetSent.current = key;
      void PhotoLibrary.setWidget({ ...data, ...lock }).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, summary, today, storage, language, pct]);
}

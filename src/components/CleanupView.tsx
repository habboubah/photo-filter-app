import { Copy, Focus } from 'lucide-react';
import type { CleanupSummary } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { Dock, Group, IconTile, Next, Row, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';

/** What the clean-up card counts, by kind, and the way into a review of all of it. */
export function CleanupView({ t, summary, onBack, onSimilar, onBlurry, onReviewAll }: {
  t: Strings;
  summary: CleanupSummary;
  onBack: () => void;
  onSimilar: () => void;
  onBlurry: () => void;
  onReviewAll: () => void;
}) {
  return (
    <Screen title={t.cleanupTitle} subtitle={bytes(t, summary.total.bytes)} onBack={onBack} backLabel={t.back} docked={summary.total.count > 0}>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.cleanupIntro}</p>
      <Group>
        <Row
          label={t.cleanupSimilar}
          sub={fmt(t.cleanupRowSub, { photos: plural(t, 'photos', summary.similar.count), size: bytes(t, summary.similar.bytes) })}
          leading={<IconTile icon={Copy} hue="lilac" />}
          trailing={<Next value={summary.similar.groups} />}
          onClick={onSimilar}
        />
        <Row
          label={t.cleanupBlurry}
          sub={fmt(t.cleanupRowSub, { photos: plural(t, 'photos', summary.blurry.count), size: bytes(t, summary.blurry.bytes) })}
          leading={<IconTile icon={Focus} hue="sand" />}
          trailing={<Next />}
          onClick={onBlurry}
        />
      </Group>
      {summary.total.count > 0 && (
        <Dock><Button full size="lg" onClick={onReviewAll}>{`${t.reviewAll} · ${plural(t, 'photos', summary.total.count)}`}</Button></Dock>
      )}
    </Screen>
  );
}

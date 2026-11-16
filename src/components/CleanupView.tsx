import { Copy, Focus, Layers, ReceiptText, Smartphone } from 'lucide-react';
import type { CleanupSummary } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { Dock, Group, IconTile, Next, Row, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';

/** What the clean-up card counts, by kind, and the ways on: a review of all of it, or the quick clean. */
export function CleanupView({ t, summary, onBack, onDuplicates, onSimilar, onBlurry, onScreenshots, onUtility, onReviewAll, onQuickClean }: {
  t: Strings;
  summary: CleanupSummary;
  onBack: () => void;
  onDuplicates: () => void;
  onSimilar: () => void;
  onBlurry: () => void;
  onScreenshots: () => void;
  onUtility: () => void;
  onReviewAll: () => void;
  onQuickClean: () => void;
}) {
  const sub = (count: number, size: number) => fmt(t.cleanupRowSub, { photos: plural(t, 'photos', count), size: bytes(t, size) });
  return (
    <Screen title={t.cleanupTitle} subtitle={bytes(t, summary.total.bytes)} onBack={onBack} backLabel={t.back} docked={summary.total.count > 0}>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.cleanupIntro}</p>
      <Group>
        <Row
          label={t.cleanupDuplicates}
          sub={sub(summary.duplicates.count, summary.duplicates.bytes)}
          leading={<IconTile icon={Layers} hue="rose" />}
          trailing={<Next value={summary.duplicates.groups} />}
          onClick={onDuplicates}
        />
        <Row
          label={t.cleanupSimilar}
          sub={sub(summary.similar.count, summary.similar.bytes)}
          leading={<IconTile icon={Copy} hue="lilac" />}
          trailing={<Next value={summary.similar.groups} />}
          onClick={onSimilar}
        />
        <Row
          label={t.cleanupBlurry}
          sub={sub(summary.blurry.count, summary.blurry.bytes)}
          leading={<IconTile icon={Focus} hue="sand" />}
          trailing={<Next />}
          onClick={onBlurry}
        />
        <Row
          label={t.cleanupScreenshots}
          sub={sub(summary.screenshots.count, summary.screenshots.bytes)}
          leading={<IconTile icon={Smartphone} hue="sky" />}
          trailing={<Next />}
          onClick={onScreenshots}
        />
        {summary.utility.count > 0 && (
          <Row
            label={t.cleanupUtility}
            sub={sub(summary.utility.count, summary.utility.bytes)}
            leading={<IconTile icon={ReceiptText} hue="mint" />}
            trailing={<Next />}
            onClick={onUtility}
          />
        )}
      </Group>
      {summary.total.count > 0 && (
        <Dock>
          <div className="flex gap-2">
            <Button size="lg" variant="secondary" onClick={onReviewAll}>{t.reviewAll}</Button>
            <Button full size="lg" onClick={onQuickClean}>{t.quickClean}</Button>
          </div>
        </Dock>
      )}
    </Screen>
  );
}

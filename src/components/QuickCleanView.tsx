import { useState } from 'react';
import type { Storage } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { CleanKind, CleanPart, selection } from '../logic/smartClean';
import { Dock, Group, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { SwitchRow } from '../ui/Controls';

/**
 * Quick clean (the plan's "Smart Clean"): each kind the clean-up card counts
 * with a switch, all on, then one system dialog for everything switched on —
 * or a review of the same photos first. Nothing is deleted without the
 * system's own dialog (CLAUDE.md, Safety rules).
 */
export function QuickCleanView({ t, parts, storage, onBack, onReview, onDelete }: {
  t: Strings;
  parts: CleanPart[];
  storage: Storage | null;
  onBack: () => void;
  onReview: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
}) {
  const present = parts.filter(p => p.ids.length > 0);
  const [on, setOn] = useState<Set<CleanKind>>(() => new Set(present.map(p => p.kind)));
  const chosen = selection(parts, on);
  const label: Record<CleanKind, string> = {
    duplicates: t.cleanupDuplicates, similar: t.cleanupSimilar, blurry: t.cleanupBlurry, screenshots: t.cleanupScreenshots,
  };
  const toggle = (kind: CleanKind, v: boolean) => setOn(s => {
    const next = new Set(s);
    if (v) next.add(kind); else next.delete(kind);
    return next;
  });

  return (
    <Screen title={t.quickCleanTitle} subtitle={bytes(t, chosen.bytes)} onBack={onBack} backLabel={t.back} docked>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.quickCleanIntro}</p>
      <Group footer={storage ? fmt(t.storageFree, { free: bytes(t, storage.free), total: bytes(t, storage.total) }) : undefined}>
        {present.map(part => (
          <SwitchRow
            key={part.kind}
            label={label[part.kind]}
            sub={fmt(t.cleanupRowSub, { photos: plural(t, 'photos', part.ids.length), size: bytes(t, part.bytes) })}
            checked={on.has(part.kind)}
            onChange={v => toggle(part.kind, v)}
          />
        ))}
      </Group>
      <Dock>
        <div className="flex gap-2">
          <Button size="lg" variant="secondary" disabled={!chosen.ids.length} onClick={() => onReview(chosen.ids)}>{t.quickCleanFirst}</Button>
          <Button full size="lg" variant="danger" disabled={!chosen.ids.length} onClick={() => onDelete(chosen.ids)}>
            {chosen.ids.length ? `${plural(t, 'deleteN', chosen.ids.length)} · ${bytes(t, chosen.bytes)}` : t.quickCleanNothing}
          </Button>
        </div>
      </Dock>
    </Screen>
  );
}

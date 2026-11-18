import { Archive } from 'lucide-react';
import { useState } from 'react';
import type { Storage } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { CleanKind, CleanPart, selection, toCheck } from '../logic/smartClean';
import { Dock, Group, Next, Row, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { SwitchRow } from '../ui/Controls';

/**
 * Quick clean (the plan's "Smart Clean"): each kind the clean-up card counts
 * with a switch, all on, then one system dialog for everything switched on —
 * or a review of the same photos first. Only what the app is sure about goes
 * in one tap (src/logic/confidence.ts); the photos to check are offered as a
 * review of their own. Nothing is deleted without the system's own dialog
 * (CLAUDE.md, Safety rules).
 */
export function QuickCleanView({ t, parts, storage, onBack, onReview, onDelete }: {
  t: Strings;
  parts: CleanPart[];
  storage: Storage | null;
  onBack: () => void;
  onReview: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
}) {
  const present = parts.filter(p => p.ids.length > 0 || p.check.length > 0);
  const [on, setOn] = useState<Set<CleanKind>>(() => new Set(present.map(p => p.kind)));
  const chosen = selection(parts, on);
  const unsure = toCheck(parts, on);
  const label: Record<CleanKind, string> = {
    duplicates: t.cleanupDuplicates, similar: t.cleanupSimilar, videos: t.lookalikeTitle, blurry: t.cleanupBlurry, exposure: t.cleanupExposure, screenshots: t.cleanupScreenshots,
  };
  const toggle = (kind: CleanKind, v: boolean) => setOn(s => {
    const next = new Set(s);
    if (v) next.add(kind); else next.delete(kind);
    return next;
  });

  return (
    <Screen title={t.quickCleanTitle} subtitle={bytes(t, chosen.bytes)} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.quickCleanIntro }} docked>
      <div data-tip="tip.quickClean">
      <Group footer={storage ? fmt(t.storageFree, { free: bytes(t, storage.free), total: bytes(t, storage.total) }) : undefined}>
        {present.map(part => (
          <SwitchRow
            key={part.kind}
            label={label[part.kind]}
            sub={fmt(t.cleanupRowSub, { photos: plural(t, part.kind === 'videos' ? 'videos' : 'photos', part.ids.length), size: bytes(t, part.bytes) })}
            checked={on.has(part.kind)}
            onChange={v => toggle(part.kind, v)}
          />
        ))}
      </Group>
      </div>
      {unsure.length > 0 && (
        <Group footer={fmt(t.quickCleanCheck, { photos: plural(t, 'photos', unsure.length) })}>
          <Row label={t.quickCleanCheckReview} trailing={<Next value={num(t, unsure.length)} />} onClick={() => onReview(unsure)} />
        </Group>
      )}
      <Dock>
        <div className="grid gap-1">
          {/* Into "Zum Löschen vorgemerkt": nothing is deleted yet, so the quiet teal, not red. */}
          <Button full size="lg" icon={Archive} disabled={!chosen.ids.length} onClick={() => onDelete(chosen.ids)}>
            {chosen.ids.length ? `${t.binAdd} · ${plural(t, 'photos', chosen.ids.length)} · ${bytes(t, chosen.bytes)}` : t.quickCleanNothing}
          </Button>
          <Button full variant="ghost" disabled={!chosen.ids.length} onClick={() => onReview(chosen.ids)}>{t.quickCleanFirst}</Button>
        </div>
      </Dock>
    </Screen>
  );
}

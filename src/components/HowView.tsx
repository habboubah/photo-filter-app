import { useState } from 'react';
import { EyeOff, Hand, Lightbulb, PlayCircle, Shield, ShieldCheck } from 'lucide-react';
import { Strings } from '../translations';
import { Group, IconTile, Next, Row, Screen } from '../ui/Screen';
import { Sheet } from '../ui/Sheet';
import { ProtectInfo, SafetyNets } from './SafetyNets';

/**
 * Einstellungen › So funktioniert Bildklar: everything the first run showed,
 * to see again — the welcome, the review's swipe hints, every tip — and the
 * two things worth knowing at any time: the three safety nets before a
 * delete, and how to protect photos. The last row hides every hint for good.
 */
export function HowView({ t, onBack, onWelcome, onGuide, onTips, onHide }: {
  t: Strings;
  onBack: () => void;
  /** The welcome's four pages, once more. */
  onWelcome: () => void;
  /** The guided review's hints show again (in a review started right away when there is something to go through). */
  onGuide: () => void;
  /** Every tip counts as unseen again. */
  onTips: () => void;
  /** No hint is shown any more. */
  onHide: () => void;
}) {
  const [sheet, setSheet] = useState<'safety' | 'protect' | null>(null);
  return (
    <Screen title={t.howTitle} onBack={onBack} backLabel={t.back}>
      <Group title={t.howAgain}>
        <Row label={t.howWelcome} sub={t.howWelcomeSub} leading={<IconTile icon={PlayCircle} hue="sky" />} trailing={<Next />} onClick={onWelcome} />
        <Row label={t.howGuide} sub={t.howGuideSub} leading={<IconTile icon={Hand} hue="mint" />} trailing={<Next />} onClick={onGuide} />
        <Row label={t.howTips} sub={t.howTipsSub} leading={<IconTile icon={Lightbulb} hue="sand" />} onClick={onTips} />
      </Group>
      <Group title={t.howGood}>
        <Row label={t.safetyTitle} leading={<IconTile icon={ShieldCheck} hue="lilac" />} trailing={<Next />} onClick={() => setSheet('safety')} />
        <Row label={t.howProtect} leading={<IconTile icon={Shield} hue="mint" />} trailing={<Next />} onClick={() => setSheet('protect')} />
      </Group>
      <Group>
        <Row label={t.howHide} sub={t.howHideSub} leading={<IconTile icon={EyeOff} hue="stone" />} onClick={onHide} />
      </Group>
      <Sheet open={sheet === 'safety'} title={t.safetyTitle} closeLabel={t.close} onClose={() => setSheet(null)}>
        <SafetyNets t={t} />
      </Sheet>
      <Sheet open={sheet === 'protect'} title={t.protectInfoTitle} closeLabel={t.close} onClose={() => setSheet(null)}>
        <ProtectInfo t={t} />
      </Sheet>
    </Screen>
  );
}

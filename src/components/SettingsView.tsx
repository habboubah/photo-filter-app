import { useState } from 'react';
import { BadgeCheck, FileText, FlaskConical, Globe, HardDrive, Images, Mail, Moon, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Star, Unlock } from 'lucide-react';
import type { Storage, ThemeMode } from '../types';
import type { Access } from '../native/photoLibrary';
import { Language, Strings, bytes, fmt, languages, plural, stringsFor } from '../translations';
import { Away, Group, IconTile, MenuRow, Next, Row, Screen } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';
import { SwitchRow } from '../ui/Controls';

interface Props {
  t: Strings;
  language: Language;
  themeMode: ThemeMode;
  access: Access | null;
  owned: boolean;
  /** Deletes left without the unlock. */
  freeLeft: number;
  debug: boolean;
  dryRun: boolean;
  storage: Storage | null;
  freed: { count: number; bytes: number };
  reminder: boolean;
  onReminder: (on: boolean) => void;
  onBack: () => void;
  onLanguage: (l: Language) => void;
  onTheme: (m: ThemeMode) => void;
  onAddPhotos: () => void;
  onOpenSettings: () => void;
  onRescan: () => void;
  onUnlock: () => void;
  onRestore: () => void;
  onDryRun: (on: boolean) => void;
  onRate?: () => void;
  onFeedback: () => void;
  onPrivacy: () => void;
  onLicences: () => void;
  onReset: () => void;
}

export function SettingsView(p: Props) {
  const { t } = p;
  const [confirmReset, setConfirmReset] = useState(false);
  const accessLabel = p.access === 'full' ? t.accessFull : p.access === 'limited' ? t.accessLimited : t.accessNone;
  return (
    <Screen title={t.settings} onBack={p.onBack} backLabel={t.back}>
      <section className="rounded-md card p-4 flex items-center gap-3">
        <img src="/icon.png" alt="" className="w-[56px] h-[56px] rounded-[14px]" draggable={false} />
        <div className="min-w-0">
          <p className="display text-heading font-semibold text-fg">{t.appName}</p>
          <p className="text-caption text-fg-mute wrap-prose">{t.tagline}</p>
          <p className="text-caption text-fg-faint num">{t.version.replace('{v}', __APP_VERSION__)}</p>
        </div>
      </section>

      <Group title={t.photosSection}>
        <Row label={t.accessRow} leading={<IconTile icon={Images} hue="sky" />} trailing={<span className="text-label text-fg-mute">{accessLabel}</span>} />
        {p.access === 'limited' && <Row label={t.addPhotos} leading={<IconTile icon={Images} hue="mint" />} trailing={<Next />} onClick={p.onAddPhotos} />}
        <Row label={t.manageAccess} leading={<IconTile icon={ShieldCheck} hue="stone" />} trailing={<Away />} onClick={p.onOpenSettings} />
        {(p.access === 'full' || p.access === 'limited') && <Row label={t.rescan} leading={<IconTile icon={RefreshCw} hue="lilac" />} onClick={p.onRescan} />}
        {p.storage && (
          <Row
            label={t.storageRow}
            sub={fmt(t.storageValue, { free: bytes(t, p.storage.free), total: bytes(t, p.storage.total) })}
            leading={<IconTile icon={HardDrive} hue="stone" />}
          />
        )}
        {p.freed.count > 0 && (
          <Row
            label={t.freedRow}
            sub={fmt(t.cleanupRowSub, { photos: plural(t, 'photos', p.freed.count), size: bytes(t, p.freed.bytes) })}
            leading={<IconTile icon={Sparkles} hue="mint" />}
          />
        )}
      </Group>

      <Group title={t.reminderSection}>
        <SwitchRow label={t.reminderRow} sub={t.reminderSub} checked={p.reminder} onChange={p.onReminder} />
      </Group>

      <Group title={t.unlockSection}>
        {p.owned
          ? <Row label={t.unlocked} leading={<IconTile icon={BadgeCheck} hue="mint" />} />
          : <Row label={t.unlockRow} sub={p.freeLeft > 0 ? plural(t, 'freeLeft', p.freeLeft) : t.freeUsedUp} leading={<IconTile icon={Unlock} hue="mint" />} trailing={<Next />} onClick={p.onUnlock} />}
        <Row label={t.restore} leading={<IconTile icon={RotateCcw} hue="stone" />} onClick={p.onRestore} />
      </Group>

      <Group title={t.displaySection}>
        <MenuRow
          label={t.language} leading={<IconTile icon={Globe} hue="sky" />} value={p.language}
          options={languages.map(l => ({ value: l, label: stringsFor(l).languageName }))}
          onChange={p.onLanguage}
        />
        <MenuRow
          label={t.appearance} leading={<IconTile icon={Moon} hue="lilac" />} value={p.themeMode}
          options={[{ value: 'system', label: t.themeSystem }, { value: 'light', label: t.themeLight }, { value: 'dark', label: t.themeDark }]}
          onChange={p.onTheme}
        />
      </Group>

      {p.debug && (
        <Group title={t.devSection}>
          <div className="flex items-start">
            <span className="ps-[16px] pt-[14px]"><IconTile icon={FlaskConical} hue="sand" /></span>
            <div className="flex-1"><SwitchRow label={t.dryRun} sub={t.dryRunSub} checked={p.dryRun} onChange={p.onDryRun} /></div>
          </div>
        </Group>
      )}

      <Group title={t.aboutSection}>
        {p.onRate && <Row label={t.rate} leading={<IconTile icon={Star} hue="sand" />} trailing={<Away />} onClick={p.onRate} />}
        <Row label={t.feedback} sub={t.feedbackSub} leading={<IconTile icon={Mail} hue="sky" />} trailing={<Away />} onClick={p.onFeedback} />
        <Row label={t.privacy} leading={<IconTile icon={ShieldCheck} hue="mint" />} trailing={<Away />} onClick={p.onPrivacy} />
        <Row label={t.licences} leading={<IconTile icon={FileText} hue="stone" />} trailing={<Next />} onClick={p.onLicences} />
      </Group>

      <Group title={t.resetSection}>
        <Row label={t.resetDecisions} danger onClick={() => setConfirmReset(true)} />
      </Group>

      <Confirm
        open={confirmReset} title={t.resetTitle} body={t.resetBody} confirmLabel={t.resetDecisions} cancelLabel={t.cancel} danger
        onConfirm={() => { setConfirmReset(false); p.onReset(); }} onCancel={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

export function LicencesView({ t, onBack }: { t: Strings; onBack: () => void }) {
  return (
    <Screen title={t.licencesTitle} onBack={onBack} backLabel={t.back}>
      <p className="text-label text-fg-mute px-1 wrap-prose">{t.licencesIntro}</p>
      <div className="rounded-md card p-5 space-y-4 text-label text-fg wrap-prose">
        <p>{t.licenceGeo}</p>
        <p>{t.licenceFonts}</p>
        <p>{t.licenceIcons}</p>
        <p>{t.licenceCode}</p>
        <p>{t.licenceAi}</p>
      </div>
    </Screen>
  );
}

import type { Strings } from '../translations';
import { isAndroid } from '../platform';
import { Group, Next, Row, Screen } from '../ui/Screen';
import data from '../licences.json';

/** One open-source part the app ships (src/licences.json, written by scripts/licences.mjs). */
interface Part {
  name: string;
  version?: string;
  licence: string;
  platforms?: string[];
  /** Who holds it and what Bildklar uses, for a shared licence text. */
  notice?: string;
  /** A translation key with a line of Bildklar's own (GeoNames: the list is in the app). */
  note?: string;
  /** The licence text, or `@<id>` for a shared one in `texts`. */
  text: string;
}

const texts = data.texts as Record<string, string>;
/** The parts this phone ships: Android's libraries only on Android, Capacitor's iOS runtime only on the iPhone. */
const parts = (): Part[] => {
  const platform = isAndroid() ? 'android' : 'ios';
  return (data.entries as Part[]).filter(p => !p.platforms || p.platforms.includes(platform));
};

const LICENCE_NAMES: Record<string, string> = {
  MIT: 'MIT', ISC: 'ISC', '0BSD': 'BSD Zero Clause', 'Apache-2.0': 'Apache 2.0', 'OFL-1.1': 'SIL Open Font License 1.1', 'CC-BY-4.0': 'CC BY 4.0',
};
const licenceName = (id: string) => LICENCE_NAMES[id] ?? id;

/** Einstellungen › Lizenzen: every open-source part, as a list; a tap shows its licence. */
export function LicencesView({ t, onBack, onOpen }: { t: Strings; onBack: () => void; onOpen: (name: string) => void }) {
  return (
    <Screen title={t.licencesTitle} onBack={onBack} backLabel={t.back}>
      <Group footer={t.licencesIntro}>
        {parts().map(p => (
          <Row key={p.name} label={<span className="wrap-compound">{p.name}</span>} sub={licenceName(p.licence)} trailing={<Next />} onClick={() => onOpen(p.name)} />
        ))}
      </Group>
    </Screen>
  );
}

/** One part's licence: who holds it, then the full text. */
export function LicenceView({ t, name, onBack }: { t: Strings; name: string; onBack: () => void }) {
  const part = (data.entries as Part[]).find(p => p.name === name);
  if (!part) return <Screen title={name} onBack={onBack} backLabel={t.back}>{null}</Screen>;
  const text = part.text.startsWith('@') ? texts[part.text.slice(1)] : part.text;
  const note = part.note ? (t as unknown as Record<string, string>)[part.note] : undefined;
  return (
    <Screen title={part.name} subtitle={[licenceName(part.licence), part.version].filter(Boolean).join(' · ')} onBack={onBack} backLabel={t.back}>
      {(note || part.notice) && (
        <div className="px-1 space-y-2 text-label text-fg wrap-prose">
          {note && <p>{note}</p>}
          {part.notice && <p className="text-fg-mute">{part.notice}</p>}
        </div>
      )}
      <div className="rounded-md card p-5 space-y-3 text-caption text-fg wrap-prose break-words whitespace-pre-line">
        {text.split('\n\n').map((par, i) => <p key={i}>{par}</p>)}
      </div>
    </Screen>
  );
}

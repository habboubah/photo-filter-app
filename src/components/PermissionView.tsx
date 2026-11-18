import { CloudOff, Images, ImagePlus, Settings, ShieldCheck } from 'lucide-react';
import type { Access } from '../native/photoLibrary';
import { Strings } from '../translations';
import { Button, IconButton } from '../ui/Button';
import { Badge } from '../ui/Controls';
import { Foot } from '../ui/FirstRun';

/**
 * The screen before the system's own question (and after a "no"): why
 * Bildklar needs the photos, in plain words — to find trips and similar
 * photos on the phone; nothing is uploaded; nothing changes without the
 * user — and the two ways to answer, named honestly: all photos (the full
 * experience) or selected ones (Bildklar then only sees what was picked, so
 * trips and duplicates may be incomplete; more can be added from home at
 * any time). One button opens the system's dialog, which offers both.
 * Denied or restricted is no dead end: why, and the way to the system
 * settings — the system won't ask twice.
 */
export function PermissionView({ t, access, onAllow, onOpenSettings, onSettings }: {
  t: Strings;
  access: Access;
  onAllow: () => void;
  onOpenSettings: () => void;
  onSettings: () => void;
}) {
  const asked = access === 'denied' || access === 'restricted';
  const promises = [
    { icon: CloudOff, text: t.permNoUpload },
    { icon: ShieldCheck, text: t.permNoChange },
  ];
  const paths = [
    { icon: Images, title: t.permAll, sub: t.permAllSub, recommended: true },
    { icon: ImagePlus, title: t.permSome, sub: t.permSomeSub, recommended: false },
  ];
  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <div className="flex justify-end px-[16px] pt-2">
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={onSettings} />
      </div>
      <main className="flex-1 flex flex-col px-6 rise-children">
        <h1 className="title-face text-title font-bold text-fg mt-3 wrap-compound">{asked ? t.deniedTitle : t.permTitle}</h1>
        <p className="text-body text-fg-mute mt-3 wrap-prose">
          {access === 'restricted' ? t.restrictedBody : asked ? t.deniedBody : t.permBody}
        </p>
        <ul className="mt-6 space-y-3">
          {promises.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center" aria-hidden="true">
                <Icon className="w-[18px] h-[18px]" strokeWidth={2.3} />
              </span>
              <span className="text-label text-fg wrap-prose pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
        {!asked && (
          <section className="mt-6" aria-labelledby="perm-choice">
            <h2 id="perm-choice" className="px-1 pb-2 text-label font-semibold text-fg-mute">{t.permChoice}</h2>
            <ul className="rounded-md card divide-hairline-inset [--sep:60px]">
              {paths.map(({ icon: Icon, title, sub, recommended }) => (
                <li key={title} className="flex items-start gap-3 p-4">
                  <span className="w-8 h-8 shrink-0 rounded-[10px] glass-flat text-fg inline-flex items-center justify-center mt-0.5" aria-hidden="true">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-body font-semibold text-fg wrap-compound">{title}</span>
                      {recommended && <Badge tone="keep">{t.permRecommended}</Badge>}
                    </span>
                    <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {/* The one action stays in reach on a small phone: the text above scrolls under it and fades into the page. */}
        <Foot>
        {asked ? (
          <>
            <Button full size="lg" onClick={onOpenSettings}>{t.openSettings}</Button>
            {access === 'restricted' && <p className="text-caption text-fg-mute text-center mt-3 wrap-prose">{t.restrictedHint}</p>}
          </>
        ) : (
          <>
            <Button full size="lg" onClick={onAllow}>{t.permAllow}</Button>
            <p className="text-caption text-fg-mute text-center mt-3 wrap-prose">{t.permHint}</p>
          </>
        )}
        </Foot>
      </main>
    </div>
  );
}

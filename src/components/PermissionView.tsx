import { Copy, Lock, Map as MapIcon, Settings } from 'lucide-react';
import type { Access } from '../native/photoLibrary';
import { Strings } from '../translations';
import { Button, IconButton } from '../ui/Button';

/**
 * The first screen until the app may see photos: what it does, and the one
 * button that asks. When access was denied (or is restricted by Screen
 * Time), the way to the system settings instead — the system won't ask twice.
 */
export function PermissionView({ t, access, onAllow, onOpenSettings, onSettings }: {
  t: Strings;
  access: Access;
  onAllow: () => void;
  onOpenSettings: () => void;
  onSettings: () => void;
}) {
  const asked = access === 'denied' || access === 'restricted';
  const points = [
    { icon: MapIcon, hue: 'sky', text: t.permPoint1 },
    { icon: Copy, hue: 'lilac', text: t.permPoint2 },
    { icon: Lock, hue: 'mint', text: t.permPoint3 },
  ];
  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <div className="flex justify-end px-[16px] pt-2">
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={onSettings} />
      </div>
      <main className="flex-1 flex flex-col px-6 pb-safe-8">
        <img src="/icon.png" alt="" className="w-[88px] h-[88px] rounded-[22px] mt-6" draggable={false} />
        <h1 className="title-face text-title font-extrabold text-fg mt-6 wrap-compound">{asked ? t.deniedTitle : t.permTitle}</h1>
        <p className="text-body text-fg-mute mt-3 wrap-prose">
          {access === 'restricted' ? t.restrictedBody : asked ? t.deniedBody : t.permBody}
        </p>
        {!asked && (
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, hue, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span data-hue={hue} className="w-10 h-10 shrink-0 rounded-[12px] bg-hue-bg text-hue-ink inline-flex items-center justify-center" aria-hidden="true">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-body text-fg wrap-prose">{text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex-1 min-h-8" />
        {access === 'restricted' ? null : asked ? (
          <Button full size="lg" onClick={onOpenSettings}>{t.openSettings}</Button>
        ) : (
          <>
            <Button full size="lg" onClick={onAllow}>{t.permAllow}</Button>
            <p className="text-caption text-fg-mute text-center mt-3 wrap-prose">{t.permHint}</p>
          </>
        )}
      </main>
    </div>
  );
}

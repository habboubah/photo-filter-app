import { motion } from 'motion/react';
import { Archive, Check, FolderHeart, Heart, Map as MapIcon, Shield, ShieldCheck, Smartphone } from 'lucide-react';
import { Strings } from '../translations';
import { Button } from '../ui/Button';
import { SETTLE } from '../ui/FirstRun';

/**
 * The three safety nets, shown once before the first real delete (the bin's
 * sheet) and again from Einstellungen › So funktioniert Bildklar: 1. you
 * mark → 2. you confirm here → 3. the phone asks once more, and then the
 * photos stay in Recently Deleted / the Trash for 30 days. One small
 * illustration: three stations on a line, lighting up one after another.
 * Nothing here is red — the red button comes after it.
 */
export function SafetyNets({ t, onContinue }: { t: Strings; onContinue?: () => void }) {
  const nets = [
    { icon: Archive, title: t.safety1, sub: t.safety1Sub },
    { icon: Check, title: t.safety2, sub: t.safety2Sub },
    { icon: Smartphone, title: t.safety3, sub: t.safety3Sub },
  ];
  return (
    <div className="pb-1">
      <p className="text-body text-fg wrap-prose">{t.safetyLead}</p>
      <ol className="relative mt-5 space-y-5">
        {/* The line the three stations sit on. */}
        <span aria-hidden="true" className="absolute top-5 bottom-5 start-[19px] w-[2px] rounded-full bg-accent-dim" />
        {nets.map(({ icon: Icon, title, sub }, i) => (
          <motion.li
            key={title} className="relative flex items-start gap-4"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SETTLE, duration: 0.45, delay: 0.15 + i * 0.22 }}
          >
            <span className="relative w-10 h-10 shrink-0 rounded-full bg-surface text-accent ring-2 ring-accent inline-flex items-center justify-center" aria-hidden="true">
              <Icon className="w-5 h-5" strokeWidth={2.3} />
              <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 rounded-full bg-accent-fill text-accent-fill-ink text-micro font-extrabold num inline-flex items-center justify-center">{i + 1}</span>
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              <span className="block text-body font-semibold text-fg wrap-compound">{title}</span>
              <span className="block text-label text-fg-mute mt-0.5 wrap-prose">{sub}</span>
            </span>
          </motion.li>
        ))}
      </ol>
      {onContinue && <Button full size="lg" className="mt-7" onClick={onContinue}>{t.safetyContinue}</Button>}
    </div>
  );
}

/**
 * Protection, explained once where it matters (after the first review) and
 * from Einstellungen › So funktioniert Bildklar: favourites are never
 * suggested, and how to protect a photo, a trip or an album / folder —
 * nothing new, only shown (src/logic/protect.ts).
 */
export function ProtectInfo({ t }: { t: Strings }) {
  const rows = [
    { icon: Heart, title: t.protectFav, sub: t.protectFavSub },
    { icon: Shield, title: t.protectOne, sub: t.protectOneSub },
    { icon: MapIcon, title: t.protectTrip, sub: t.protectTripSub },
    { icon: FolderHeart, title: t.protectAlbum, sub: t.protectAlbumSub },
  ];
  return (
    <div className="pb-1">
      <ul className="space-y-4">
        {rows.map(({ icon: Icon, title, sub }) => (
          <li key={title} className="flex items-start gap-4">
            <span className="w-10 h-10 shrink-0 rounded-[12px] glass-flat text-fg inline-flex items-center justify-center" aria-hidden="true">
              <Icon className="w-5 h-5" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-fg wrap-compound">{title}</span>
              <span className="block text-label text-fg-mute mt-0.5 wrap-prose">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex items-start gap-2 text-label text-fg-mute wrap-prose">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-keep" strokeWidth={2.6} aria-hidden="true" />
        <span>{t.protectFoot}</span>
      </p>
    </div>
  );
}

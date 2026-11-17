import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Strings, fmt, plural } from '../translations';
import { PRODUCT_ID, Product, Purchases } from '../native/purchases';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { notifySuccess } from '../ui/haptics';

/** The deletes still possible without the unlock (src/logic/allowance.ts). */
export interface FreeInfo {
  left: number;
  /** Set when a delete of this many photos asked for more than `left`. */
  wanted?: number;
  /** Deletes just the first `left` of them. */
  deleteLeft?: () => void;
}

/**
 * The one paywall: shown when an album / folder, a larger video, a Live
 * Photo conversion or a delete beyond the first FREE_DELETES needs the
 * unlock, and from Settings. Scanning and looking stay free. The price is the
 * store's own, in the user's currency; there is no other offer, no timer, no
 * trial.
 */
export function PaywallSheet({ t, open, free, onClose, onOwned, toast }: {
  t: Strings;
  open: boolean;
  free?: FreeInfo;
  onClose: () => void;
  onOwned: () => void;
  toast: (label: string) => void;
}) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  useEffect(() => {
    if (!open) return;
    setProduct(undefined);
    Purchases.getProduct({ id: PRODUCT_ID }).then(r => setProduct(r.product)).catch(() => setProduct(null));
  }, [open]);

  const buy = async () => {
    setBusy('buy');
    try {
      const { state } = await Purchases.purchase({ id: PRODUCT_ID });
      if (state === 'purchased') { notifySuccess(); toast(t.purchased); onOwned(); }
      else if (state === 'pending') toast(t.purchasePending);
      else if (state === 'failed') toast(t.purchaseFailed);
    } catch { toast(t.purchaseFailed); } finally { setBusy(null); }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const { owned } = await Purchases.restore({ id: PRODUCT_ID });
      if (owned) { notifySuccess(); toast(t.restoredOk); onOwned(); } else toast(t.restoredNone);
    } catch { toast(t.storeUnavailable); } finally { setBusy(null); }
  };

  const points = [t.paywallAlbums, t.paywallDelete, t.paywallPhotos, t.paywallSave, t.paywallOnce, t.paywallPrivate];
  return (
    <Sheet open={open} title={t.paywallTitle} closeLabel={t.close} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <img src="/icon.png" alt="" className="w-[72px] h-[72px] rounded-[18px]" draggable={false} />
        <p className="text-body text-fg-mute mt-4 wrap-prose max-w-sm">{t.paywallBody}</p>
        {free && (
          <p className="text-body text-fg mt-3 wrap-prose max-w-sm" data-free-left={free.left}>
            {free.wanted !== undefined && free.left > 0
              ? fmt(t.freeTooMany, { photos: plural(t, 'photos', free.wanted), left: free.left })
              : free.left > 0 ? plural(t, 'freeLeft', free.left) : t.freeUsedUp}
          </p>
        )}
      </div>
      <ul className="mt-5 space-y-3">
        {points.map(text => (
          <li key={text} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-keep-dim text-keep inline-flex items-center justify-center shrink-0" aria-hidden="true">
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
            <span className="text-body text-fg wrap-prose">{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7 space-y-2">
        <Button full size="lg" disabled={!product || busy !== null} onClick={buy}>
          {product ? fmt(t.buyFor, { price: product.price }) : product === null ? t.paywallTitle : t.buyLoading}
        </Button>
        {product === null && <p className="text-caption text-neg text-center wrap-prose">{t.storeUnavailable}</p>}
        {free?.deleteLeft && free.left > 0 && (
          <Button full variant="secondary" disabled={busy !== null} onClick={free.deleteLeft}>{plural(t, 'deleteN', free.left)}</Button>
        )}
        <Button full variant="ghost" disabled={busy !== null} onClick={restore}>{t.restore}</Button>
      </div>
      <p className="text-caption text-fg-mute text-center mt-3 wrap-prose">{t.paywallFoot}</p>
    </Sheet>
  );
}

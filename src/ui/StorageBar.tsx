/**
 * The library's space, split by what it is, as the bar in iOS Settings ›
 * iPhone Storage: one track, one segment per category, as wide as its share,
 * in the category's hue (the same hue as its dot on the card below), parted
 * by hairline gaps; a `soft` segment (what is fine as it is) is paler. Read
 * out as one line.
 */
export function StorageBar({ parts, label }: {
  parts: { key: string; hue: string; bytes: number; soft?: boolean }[];
  /** What the bar shows, in words ("Davon: Duplikate 40 MB, …"). */
  label: string;
}) {
  const shown = parts.filter(p => p.bytes > 0);
  if (!shown.length) return null;
  return (
    <div role="img" aria-label={label} className="flex h-[14px] gap-[2px] rounded-full overflow-hidden">
      {shown.map(p => (
        <span key={p.key} data-hue={p.hue} className={`h-full min-w-[8px] bg-hue-solid ${p.soft ? 'opacity-40' : ''}`} style={{ flexGrow: p.bytes, flexBasis: 0 }} />
      ))}
    </div>
  );
}

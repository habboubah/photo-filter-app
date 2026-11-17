/**
 * The space that could be freed, split by where it comes from, as the bar in
 * iOS Settings › iPhone Storage: one track, one segment per category, as wide
 * as its share, in the category's hue (the same hue as its dot on the card
 * below), parted by hairline gaps. Read out as one line.
 */
export function StorageBar({ parts, label }: {
  parts: { key: string; hue: string; bytes: number }[];
  /** What the bar shows, in words ("Davon: Duplikate 40 MB, …"). */
  label: string;
}) {
  const shown = parts.filter(p => p.bytes > 0);
  if (!shown.length) return null;
  return (
    <div role="img" aria-label={label} className="flex h-[14px] gap-[2px] rounded-full overflow-hidden">
      {shown.map(p => (
        <span key={p.key} data-hue={p.hue} className="h-full min-w-[8px] bg-hue-solid" style={{ flexGrow: p.bytes, flexBasis: 0 }} />
      ))}
    </div>
  );
}

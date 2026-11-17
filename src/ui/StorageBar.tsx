/**
 * The space that could be freed, split by where it comes from: one rounded
 * segment per category, as wide as its share, in the category's hue (the
 * same hue as its dot on the card below). Read out as one line.
 */
export function StorageBar({ parts, label }: {
  parts: { key: string; hue: string; bytes: number }[];
  /** What the bar shows, in words ("Davon: Duplikate 40 MB, …"). */
  label: string;
}) {
  const shown = parts.filter(p => p.bytes > 0);
  if (!shown.length) return null;
  return (
    <div role="img" aria-label={label} className="flex h-3 gap-[3px]">
      {shown.map(p => (
        <span key={p.key} data-hue={p.hue} className="h-full min-w-[10px] rounded-full bg-hue-ink" style={{ flexGrow: p.bytes, flexBasis: 0 }} />
      ))}
    </div>
  );
}

import type { Strings } from '../translations';
import { SORT_KEYS, type SortKey } from '../logic/sort';
import { SortMenu } from '../ui/Controls';

/** A list screen's sort menu: newest, oldest or largest first (src/logic/sort.ts). */
export function SortButton({ t, value, onChange, inline }: { t: Strings; value: SortKey; onChange: (key: SortKey) => void; inline?: boolean }) {
  return <SortMenu inline={inline} label={t.sortLabel} value={value} onChange={onChange} options={SORT_KEYS.map(k => ({ value: k, label: t[`sort_${k}`] }))} />;
}

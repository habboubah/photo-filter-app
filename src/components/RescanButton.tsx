import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Strings, ago, fmt } from '../translations';
import type { ScanView } from '../store';
import { IconButton } from '../ui/Button';
import { Confirm } from '../ui/Sheet';

/**
 * *Neu durchsuchen* [Scan again] in a root tab's bar (Aufräumen and Ordnen):
 * spins while a scan runs, says when the last one was, and asks before a full
 * rescan starts.
 */
export function RescanButton({ t, scan, onRescan }: { t: Strings; scan: ScanView; onRescan: () => void }) {
  const [ask, setAsk] = useState(false);
  const lastScan = scan.lastScanAt ? fmt(t.lastScan, { when: ago(t, scan.lastScanAt, Date.now()) }) : null;
  const label = scan.running ? `${t.rescan}: ${t.scanUpdating}` : lastScan ? `${t.rescan} (${lastScan})` : t.rescan;
  return (
    <>
      <IconButton
        label={label} icon={RefreshCw} tone="bar" disabled={scan.running}
        className={scan.running ? '[&>svg]:motion-safe:animate-spin' : ''}
        onClick={() => { if (!scan.running) setAsk(true); }}
      />
      <Confirm
        open={ask} title={t.rescanAllTitle} body={t.rescanAllBody}
        confirmLabel={t.rescan} cancelLabel={t.cancel}
        onConfirm={() => { setAsk(false); onRescan(); }} onCancel={() => setAsk(false)}
      />
    </>
  );
}

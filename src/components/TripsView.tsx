import type { Trip } from '../types';
import { Strings } from '../translations';
import { Screen } from '../ui/Screen';
import { TripCard } from './TripCard';

/** Every trip, newest first; hidden ones in their own section at the end. */
export function TripsView({ t, trips, onBack, onOpen }: { t: Strings; trips: Trip[]; onBack: () => void; onOpen: (key: string) => void }) {
  const shown = trips.filter(x => !x.ignored);
  const hidden = trips.filter(x => x.ignored);
  return (
    <Screen title={t.tripsTitle} onBack={onBack} backLabel={t.back}>
      <div className="space-y-[10px]">
        {shown.map(trip => <TripCard key={trip.key} trip={trip} t={t} onOpen={() => onOpen(trip.key)} />)}
      </div>
      {hidden.length > 0 && (
        <section>
          <h2 className="px-[16px] pb-2 eyebrow text-fg-mute">{t.ignoredSection}</h2>
          <div className="space-y-[10px]">
            {hidden.map(trip => <TripCard key={trip.key} trip={trip} t={t} onOpen={() => onOpen(trip.key)} />)}
          </div>
        </section>
      )}
    </Screen>
  );
}

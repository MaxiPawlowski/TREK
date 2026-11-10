import { Radar, X } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { NEARBY_RADII_M, hasCoords, walkMinutes, type PlacesNearbyAnchor } from '../../utils/placesNearby';
import { formatDistance } from '../../utils/units';
import { DialogButton, fs } from '../shared/DialogShell';
import { Tooltip } from '../shared/Tooltip';
import { tintOf } from './planParts';
import { usePlacesNearby } from './usePlacesNearby';

interface Props {
  nearby: PlacesNearbyAnchor | null;
  count: number;
  setNearbyRadius: (radiusM: number) => void;
  closeNearby: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * The head of the list while "near this place" is on: what the list is measured from,
 * the radius as a row of choices, and how to leave. Sits in the places column's head
 * band, under the filters, so it reads as one more filter in force.
 */
export function PlacesNearbyBanner({ nearby, count, setNearbyRadius, closeNearby, t }: Props) {
  const unit = useSettingsStore((s) => s.settings.distance_unit ?? 'metric');
  if (!nearby) return null;
  return (
    <section
      aria-label={t('places.nearTitle', { name: nearby.name })}
      className="flex flex-col gap-2 rounded-[12px] px-2.5 py-2 ring-1 ring-inset ring-edge"
      style={{ background: tintOf('var(--accent)', 10) }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Radar size={15} strokeWidth={2.2} className="mt-0.5 flex-none text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-content" style={fs(12.5, 'body')}>
            {t('places.nearTitle', { name: nearby.name })}
          </div>
          <div className="tabular-nums text-content-muted" style={fs(11.5)} role="status">
            {t('places.nearCount', {
              count,
              distance: formatDistance(nearby.radiusM / 1000, unit),
              minutes: walkMinutes(nearby.radiusM),
            })}
          </div>
        </div>
        <Tooltip label={t('places.nearClose')}>
          <button
            type="button"
            onClick={closeNearby}
            aria-label={t('places.nearClose')}
            className="grid h-6 w-6 flex-none place-items-center rounded-full text-content-muted hover:bg-surface-hover hover:text-content"
          >
            <X size={13} strokeWidth={2.4} />
          </button>
        </Tooltip>
      </div>
      <div role="radiogroup" aria-label={t('places.nearRadius')} className="flex flex-wrap gap-1">
        {NEARBY_RADII_M.map((r) => {
          const on = r === nearby.radiusM;
          return (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setNearbyRadius(r)}
              className={`h-7 rounded-full px-2.5 font-medium tabular-nums transition-colors ${on ? 'bg-accent text-accent-text' : 'bg-surface-card text-content-secondary shadow-sm hover:text-content'}`}
              style={fs(11.5, 'body')}
            >
              {formatDistance(r / 1000, unit)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The distance badge on a row while "near" is on: how far, and roughly how long on foot. */
export function NearbyDistance({ distanceM, t }: { distanceM: number; t: Props['t'] }) {
  const unit = useSettingsStore((s) => s.settings.distance_unit ?? 'metric');
  return (
    <span className="flex flex-none flex-col items-end tabular-nums leading-tight">
      <span className="font-semibold text-content-secondary" style={fs(11.5, 'body')}>
        {formatDistance(distanceM / 1000, unit)}
      </span>
      <span className="text-content-faint" style={fs(10.5)}>
        {t('places.nearWalk', { minutes: walkMinutes(distanceM) })}
      </span>
    </span>
  );
}

/**
 * "Near here" in the place card's action bar. Pressed while this place is the centre;
 * a second click closes the radius again.
 */
export function NearbyButton({
  place,
  t,
}: {
  place: { id: number; name: string; lat?: number | null; lng?: number | null };
  t: Props['t'];
}) {
  const { nearby, openNearby, closeNearby } = usePlacesNearby();
  if (!hasCoords(place)) return null;
  const on = nearby?.placeId === place.id;
  return (
    <DialogButton
      active={on}
      onClick={() => (on ? closeNearby() : openNearby(place))}
      icon={<Radar size={14} strokeWidth={2} />}
      aria-label={t('places.nearHere')}
      aria-pressed={on}
    >
      <span className="max-sm:hidden">{t('places.nearHere')}</span>
    </DialogButton>
  );
}

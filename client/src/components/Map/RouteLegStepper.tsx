import { ChevronLeft, ChevronRight, Waypoints, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { routeModeIcon } from '../Planner/routeModes';
import { MapTogglePill } from './MapTogglePill';
import type { RouteLegFocus } from './useRouteLegFocus';

/** The round control that switches the map between the whole day and one leg at a time. */
export function RouteLegsPill({ focus }: { focus: RouteLegFocus }) {
  const { t } = useTranslation();
  if (!focus.legs.length) return null;
  const on = focus.index != null;
  return (
    <MapTogglePill
      active={on}
      onToggle={on ? focus.close : focus.open}
      label={on ? t('map.legs.hide') : t('map.legs.show')}
      testId="route-legs-pill"
      icon={<Waypoints size={17} strokeWidth={2} />}
    />
  );
}

/** A size that follows the user's text size setting, like the rest of the map chrome. */
const fsc = (px: number, tier: 'caption' | 'body' = 'caption') => ({
  fontSize: `calc(${px}px * var(--fs-scale-${tier}, 1))`,
});

const roundButton =
  'grid h-9 w-9 flex-none place-items-center rounded-full text-content hover:bg-surface-hover disabled:opacity-35 disabled:hover:bg-transparent';

/**
 * The leg on show: which of the day's legs it is, the two places it joins, and how long
 * it takes. The arrows step through the day in order; the cross goes back to the whole
 * route. One component for the phone and the desktop, which only place it differently.
 */
export function RouteLegCard({ focus, maxWidth = 360 }: { focus: RouteLegFocus; maxWidth?: number }) {
  const { t } = useTranslation();
  const { index, legs } = focus;
  if (index == null || !legs[index]) return null;
  const leg = legs[index];
  const ModeIcon = routeModeIcon(leg.mode);
  const hotel = t('map.legs.hotel');
  const stop = t('map.legs.stop');
  const fromName = leg.fromName ?? (leg.hotelBookend === 'morning' ? hotel : stop);
  const toName = leg.toName ?? (leg.hotelBookend === 'evening' ? hotel : stop);
  return (
    <section
      aria-label={t('map.legs.counter', { n: index + 1, total: legs.length })}
      data-testid="route-leg-card"
      className="flex items-center gap-1 rounded-[16px] px-1.5 py-1.5 text-content"
      style={{
        pointerEvents: 'auto',
        width: '100%',
        maxWidth,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
      }}
    >
      <button
        type="button"
        className={roundButton}
        onClick={focus.prev}
        disabled={index === 0}
        aria-label={t('map.legs.prev')}
      >
        <ChevronLeft size={18} strokeWidth={2.4} className="rtl:rotate-180" />
      </button>
      <div className="min-w-0 flex-1 px-1">
        <div className="font-semibold uppercase tracking-wide text-accent" style={fsc(11)} role="status">
          {t('map.legs.counter', { n: index + 1, total: legs.length })}
        </div>
        <div className="truncate leading-snug text-content-muted" style={fsc(12, 'body')}>
          {fromName}
        </div>
        <div className="truncate font-semibold leading-snug" style={fsc(13, 'body')}>
          <span className="text-content-muted">→</span> {toName}
        </div>
        <div className="flex items-center gap-1 tabular-nums text-content-muted" style={fsc(12)}>
          <ModeIcon size={13} strokeWidth={2.2} aria-hidden />
          <span>{[leg.durationText, leg.distanceText].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <button
        type="button"
        className={roundButton}
        onClick={focus.next}
        disabled={index >= legs.length - 1}
        aria-label={t('map.legs.next')}
      >
        <ChevronRight size={18} strokeWidth={2.4} className="rtl:rotate-180" />
      </button>
      <button
        type="button"
        className={`${roundButton} text-content-muted`}
        onClick={focus.close}
        aria-label={t('map.legs.close')}
      >
        <X size={16} strokeWidth={2.4} />
      </button>
    </section>
  );
}

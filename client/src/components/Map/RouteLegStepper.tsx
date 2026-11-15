import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Waypoints, X } from 'lucide-react';
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
const smallButton = 'grid h-7 w-7 flex-none place-items-center rounded-full text-content-muted hover:bg-surface-hover';

const shell = {
  pointerEvents: 'auto' as const,
  background: 'var(--sidebar-bg)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: 'var(--sidebar-shadow, 0 4px 16px rgba(0,0,0,0.14))',
};

function PrevNext({ focus, which }: { focus: RouteLegFocus; which: 'prev' | 'next' }) {
  const { t } = useTranslation();
  const index = focus.index ?? 0;
  const isPrev = which === 'prev';
  return (
    <button
      type="button"
      className={roundButton}
      onClick={isPrev ? focus.prev : focus.next}
      disabled={isPrev ? index === 0 : index >= focus.legs.length - 1}
      aria-label={isPrev ? t('map.legs.prev') : t('map.legs.next')}
    >
      {isPrev ? (
        <ChevronLeft size={18} strokeWidth={2.4} className="rtl:rotate-180" />
      ) : (
        <ChevronRight size={18} strokeWidth={2.4} className="rtl:rotate-180" />
      )}
    </button>
  );
}

/** The card folded down: just the arrows and where in the day it is, so the map shows. */
function MinimizedLegCard({ focus }: { focus: RouteLegFocus }) {
  const { t } = useTranslation();
  const index = focus.index ?? 0;
  return (
    <section
      aria-label={t('map.legs.counter', { n: index + 1, total: focus.legs.length })}
      data-testid="route-leg-card-mini"
      className="flex items-center gap-0.5 rounded-full p-1 text-content"
      style={shell}
    >
      <PrevNext focus={focus} which="prev" />
      <span className="min-w-[2.6rem] text-center font-semibold tabular-nums" style={fsc(13, 'body')} role="status">
        {index + 1}/{focus.legs.length}
      </span>
      <PrevNext focus={focus} which="next" />
      <button
        type="button"
        className={roundButton}
        onClick={() => focus.setMinimized(false)}
        aria-label={t('map.legs.expand')}
      >
        <ChevronUp size={18} strokeWidth={2.4} />
      </button>
    </section>
  );
}

/**
 * The leg on show: which of the day's legs it is, the two places it joins, and how long
 * it takes. The arrows step through the day in order; "only this leg" leaves the rest of
 * the day off the map; the fold-down arrow shrinks the card to its arrows so the map
 * under it shows, the leg staying lit; the cross goes back to the whole route. One
 * component for the phone and the desktop, which only place it differently.
 */
export function RouteLegCard({ focus, maxWidth = 360 }: { focus: RouteLegFocus; maxWidth?: number }) {
  const { t } = useTranslation();
  const { index, legs } = focus;
  if (index == null || !legs[index]) return null;
  if (focus.minimized) return <MinimizedLegCard focus={focus} />;
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
      className="rounded-[16px] px-1.5 pb-1.5 pt-1 text-content"
      style={{ ...shell, width: '100%', maxWidth }}
    >
      <div className="flex items-center gap-1 ps-2">
        <div className="flex-1 font-semibold uppercase tracking-wide text-accent" style={fsc(11)} role="status">
          {t('map.legs.counter', { n: index + 1, total: legs.length })}
        </div>
        <button
          type="button"
          aria-pressed={focus.restHidden}
          onClick={focus.toggleRest}
          data-testid="route-leg-only"
          className={`flex-none rounded-full border px-2.5 py-1 font-semibold ${
            focus.restHidden
              ? 'border-transparent bg-accent text-accent-text'
              : 'border-border-primary text-content-muted hover:bg-surface-hover'
          }`}
          style={fsc(11)}
        >
          {t('map.legs.onlyThis')}
        </button>
        <button
          type="button"
          className={smallButton}
          onClick={() => focus.setMinimized(true)}
          aria-label={t('map.legs.minimize')}
        >
          <ChevronDown size={16} strokeWidth={2.4} />
        </button>
        <button type="button" className={smallButton} onClick={focus.close} aria-label={t('map.legs.close')}>
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <PrevNext focus={focus} which="prev" />
        <div className="min-w-0 flex-1 px-1">
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
        <PrevNext focus={focus} which="next" />
      </div>
    </section>
  );
}

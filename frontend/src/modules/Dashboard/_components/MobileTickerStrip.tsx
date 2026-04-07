import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setSelectedTicker } from '@store/slices/selectedTickerSlice';
import { useTickers } from '@hooks/useTickers';
import type { ITicker } from '../../../app/api/types/ticker.types';
import PriceFlash from './PriceFlash';
import SetAlertModal from './SetAlertModal';

/**
 * Horizontal swipeable ticker navigator for mobile / narrow viewports.
 * On lg+ this whole component is hidden — the vertical sidebar list takes over.
 *
 * Each pill subscribes to its own slice of `livePrices` via a granular
 * selector, so price flashes only re-render the affected pill (same pattern
 * as TickerRow on the desktop sidebar).
 */
function MobileTickerStrip() {
  const { tickers } = useTickers();
  const selected = useAppSelector((s) => s.selectedTicker.symbol);

  if (tickers.length === 0) return null;

  return (
    <div className="border-b border-border bg-surface lg:hidden">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-dim">
          Markets
        </span>
        <span className="num text-[10px] text-text-dim">
          Swipe →
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-3 py-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {tickers.map((t) => (
          <MobileTickerPill
            key={t.symbol}
            ticker={t}
            selected={selected === t.symbol}
          />
        ))}
      </div>
    </div>
  );
}

interface PillProps {
  ticker: ITicker;
  selected: boolean;
}

function MobileTickerPill({ ticker, selected }: PillProps) {
  const dispatch = useAppDispatch();
  const tick = useAppSelector((s) => s.livePrices.bySymbol[ticker.symbol]);
  const ref = useRef<HTMLDivElement>(null);
  const [alertOpen, setAlertOpen] = useState(false);

  // When this pill becomes selected (e.g., auto-selected on load), scroll
  // it into view so the user always sees which symbol the chart is on.
  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selected]);

  const price = tick?.price ?? ticker.base_price;
  const changePct = tick?.changePct ?? 0;
  const up = changePct >= 0;

  return (
    <>
      <div
        ref={ref}
        style={{ scrollSnapAlign: 'start' }}
        className={cn(
          'relative flex shrink-0 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors',
          'min-w-[120px]',
          selected
            ? 'border-accent bg-accent-soft'
            : 'border-border bg-surface-2 hover:bg-surface-2/80',
        )}
      >
        {/* The whole pill is the row-select target. Bell button is overlaid
            in the corner with stopPropagation so it doesn't trigger select. */}
        <button
          type="button"
          onClick={() => dispatch(setSelectedTicker(ticker.symbol))}
          className="flex flex-col items-start gap-0.5 pr-5 text-left"
        >
          <span className="text-xs font-semibold tracking-tight">
            {ticker.symbol}
          </span>
          <PriceFlash
            value={price}
            format={(n) =>
              `$${n.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }
            className="text-xs font-medium"
          />
          <span
            className={cn(
              'num text-[10px] font-medium',
              up ? 'text-up' : 'text-down',
            )}
          >
            {up ? '+' : ''}
            {changePct.toFixed(2)}%
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAlertOpen(true);
          }}
          aria-label={`Set price alert for ${ticker.symbol}`}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded text-text-dim hover:bg-accent/15 hover:text-accent"
        >
          <Bell className="h-3 w-3" />
        </button>
      </div>

      {alertOpen && (
        <SetAlertModal
          symbol={ticker.symbol}
          onClose={() => setAlertOpen(false)}
        />
      )}
    </>
  );
}

export default MobileTickerStrip;

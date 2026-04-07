import { AlertCircle } from 'lucide-react';
import { useTickers } from '@hooks/useTickers';
import TickerRow from '../_components/TickerRow';

// Note: the live-price subscription and auto-select-first-ticker effect
// live in DashboardPage so they stay mounted regardless of which navigator
// (this sidebar on lg+, MobileTickerStrip below lg) is visible.
function TickerListView() {
  const { tickers, isLoading, error } = useTickers();

  if (isLoading) {
    return <TickerListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-down">
        <AlertCircle className="h-5 w-5" />
        Failed to load tickers
      </div>
    );
  }

  if (tickers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-dim">
        No tickers available
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-dim">
          Markets
        </span>
        <span className="num text-[10px] text-text-dim">
          {tickers.length} symbols
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {tickers.map((t) => (
          <TickerRow key={t.symbol} ticker={t} />
        ))}
      </div>
    </div>
  );
}

/**
 * Animated skeleton that mirrors the real ticker list footprint so the
 * sidebar doesn't visually jump when the SWR fetch resolves. Uses the
 * same surface/border tokens as the real rows so it auto-skins for
 * light & dark themes.
 */
function TickerListSkeleton() {
  // Match the seeded ticker count so the skeleton reserves the right
  // amount of vertical space on first paint.
  const rows = Array.from({ length: 6 });
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-dim">
          Markets
        </span>
        <span className="num text-[10px] text-text-dim">loading…</span>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {rows.map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-l-2 border-l-transparent px-4 py-3"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3 w-12 animate-pulse rounded bg-surface-2" />
              <div className="h-2.5 w-24 animate-pulse rounded bg-surface-2/70" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-3 w-16 animate-pulse rounded bg-surface-2" />
              <div className="h-2.5 w-12 animate-pulse rounded bg-surface-2/70" />
            </div>
            <div className="h-7 w-7 shrink-0 animate-pulse rounded border border-border bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default TickerListView;

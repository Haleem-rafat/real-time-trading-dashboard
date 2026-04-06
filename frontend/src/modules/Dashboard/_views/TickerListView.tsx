import { Loader2, AlertCircle } from 'lucide-react';
import { useTickers } from '@hooks/useTickers';
import TickerRow from '../_components/TickerRow';

// Note: the live-price subscription and auto-select-first-ticker effect
// live in DashboardPage so they stay mounted regardless of which navigator
// (this sidebar on lg+, MobileTickerStrip below lg) is visible.
function TickerListView() {
  const { tickers, isLoading, error } = useTickers();

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
      </div>
    );
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

export default TickerListView;

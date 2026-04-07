import { useState, type KeyboardEvent } from 'react';
import { Bell, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setSelectedTicker } from '@store/slices/selectedTickerSlice';
import type { ITicker } from '../../../app/api/types/ticker.types';
import PriceFlash from './PriceFlash';
import SetAlertModal from './SetAlertModal';

interface Props {
  ticker: ITicker;
}

function TickerRow({ ticker }: Props) {
  const dispatch = useAppDispatch();
  const tick = useAppSelector((s) => s.livePrices.bySymbol[ticker.symbol]);
  const selected = useAppSelector(
    (s) => s.selectedTicker.symbol === ticker.symbol,
  );
  const [alertOpen, setAlertOpen] = useState(false);
  const hasActiveAlert = useAppSelector((s) =>
    s.triggeredAlerts.items.some(
      (a) => a.symbol === ticker.symbol && a.triggeredAt > Date.now() - 60_000,
    ),
  );

  const price = tick?.price ?? ticker.base_price;
  const changePct = tick?.changePct ?? 0;
  const up = changePct >= 0;
  const isCrypto = ticker.asset_type === 'crypto';

  const select = () => dispatch(setSelectedTicker(ticker.symbol));

  const onRowKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  };

  return (
    <>
      {/* Row is a div (not a button) so we can nest a real button for the
          alert action. Still selectable via click + keyboard for a11y. */}
      <div
        role="button"
        tabIndex={0}
        onClick={select}
        onKeyDown={onRowKey}
        className={cn(
          'group flex w-full cursor-pointer items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors',
          'hover:bg-surface-2 focus:outline-none focus:bg-surface-2',
          selected ? 'border-l-accent bg-surface-2' : 'border-l-transparent',
        )}
      >
        {/* Left: symbol + name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">
              {ticker.symbol}
            </span>
            {isCrypto && (
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
                Crypto
              </span>
            )}
          </div>
          <span className="block truncate text-xs text-text-dim">
            {ticker.name}
          </span>
        </div>

        {/* Middle: price + change */}
        <div className="flex flex-col items-end gap-0.5">
          <PriceFlash
            value={price}
            format={(n) =>
              `$${n.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }
            className="text-sm font-medium"
          />
          <span
            className={cn(
              'num flex items-center gap-1 text-[11px] font-medium',
              up ? 'text-up' : 'text-down',
            )}
          >
            {up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {up ? '+' : ''}
            {changePct.toFixed(3)}%
          </span>
        </div>

        {/* Right: always-visible alert button — its own real <button> so
            it's keyboard reachable and click events don't bubble to the
            row's select handler. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAlertOpen(true);
          }}
          aria-label={`Set price alert for ${ticker.symbol}`}
          title={`Set price alert for ${ticker.symbol}`}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-all',
            'border-border bg-surface text-text-dim',
            'hover:border-accent hover:bg-accent-soft hover:text-accent',
            'focus:outline-none focus:ring-2 focus:ring-accent/40',
            hasActiveAlert && 'border-accent bg-accent-soft text-accent',
          )}
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Conditional mount → fresh form state on every open, no reset effect */}
      {alertOpen && (
        <SetAlertModal
          symbol={ticker.symbol}
          onClose={() => setAlertOpen(false)}
        />
      )}
    </>
  );
}

export default TickerRow;

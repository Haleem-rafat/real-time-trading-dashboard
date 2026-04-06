import { useEffect, useMemo } from 'react';
import { useTickers } from '@hooks/useTickers';
import { useLivePrices } from '@hooks/useLivePrices';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setSelectedTicker } from '@store/slices/selectedTickerSlice';
import DashboardLayout from '../_layouts/DashboardLayout';
import TickerListView from '../_views/TickerListView';
import PriceChartView from '../_views/PriceChartView';
import MobileTickerStrip from '../_components/MobileTickerStrip';

function DashboardPage() {
  const { tickers } = useTickers();
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.selectedTicker.symbol);

  // Single source of truth for the live-price subscription. Lives at the
  // page level so it stays mounted regardless of which navigator (mobile
  // strip vs desktop sidebar) is currently rendered.
  const symbols = useMemo(() => tickers.map((t) => t.symbol), [tickers]);
  useLivePrices(symbols);

  // Auto-select the first ticker once the list loads.
  useEffect(() => {
    if (!selected && tickers.length > 0) {
      dispatch(setSelectedTicker(tickers[0].symbol));
    }
  }, [selected, tickers, dispatch]);

  return (
    <DashboardLayout sidebar={<TickerListView />}>
      <MobileTickerStrip />
      <PriceChartView />
    </DashboardLayout>
  );
}

export default DashboardPage;

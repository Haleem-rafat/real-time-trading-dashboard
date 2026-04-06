import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppSelector } from '@store/hooks';
import { useTickerHistory } from '@hooks/useTickerHistory';
import type { IPricePoint } from '../../../app/api/types/ticker.types';

interface Props {
  symbol: string;
}

const MAX_POINTS = 300;

interface ChartPoint {
  ts: number; // millis (used as XAxis dataKey)
  price: number;
}

function toChartPoint(p: IPricePoint): ChartPoint {
  return { ts: new Date(p.timestamp).getTime(), price: p.price };
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeLong(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function LiveChart({ symbol }: Props) {
  const { history, isLoading, error } = useTickerHistory(symbol, '1h', '1m');
  const tick = useAppSelector((s) => s.livePrices.bySymbol[symbol]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  // Seed local chart series whenever the historical fetch resolves (or symbol changes)
  useEffect(() => {
    if (history.length > 0) {
      setChartData(history.map(toChartPoint));
    } else {
      setChartData([]);
    }
  }, [history, symbol]);

  // Append every new live tick for this symbol; cap at MAX_POINTS
  useEffect(() => {
    if (!tick || tick.symbol !== symbol) return;
    setChartData((prev) => {
      const next: ChartPoint[] = [
        ...prev,
        { ts: tick.timestamp, price: tick.price },
      ];
      return next.length > MAX_POINTS
        ? next.slice(next.length - MAX_POINTS)
        : next;
    });
  }, [tick, symbol]);

  // Compute trend color from first vs last point of the visible series
  const lineColor = useMemo(() => {
    if (chartData.length < 2) return '#00d4ff';
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    return last >= first ? '#00ff88' : '#ff3366';
  }, [chartData]);

  const gradientId = `grad-${symbol}`;

  if (isLoading && chartData.length === 0) {
    return (
      <div className="flex h-full min-h-[260px] sm:min-h-[360px] items-center justify-center text-sm text-text-dim">
        Loading chart…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[260px] sm:min-h-[360px] items-center justify-center text-sm text-down">
        Failed to load history
      </div>
    );
  }

  return (
    <div className="h-full min-h-[260px] sm:min-h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1f1f2e"
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke="#6b7280"
            fontSize={11}
            tickFormatter={formatTimeShort}
            minTickGap={60}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={11}
            domain={['auto', 'auto']}
            tickFormatter={(p: number) =>
              p >= 1000
                ? `$${(p / 1000).toFixed(1)}k`
                : `$${p.toFixed(2)}`
            }
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#12121a',
              border: '1px solid #1f1f2e',
              borderRadius: 6,
              fontSize: 12,
              padding: '8px 12px',
            }}
            labelStyle={{
              color: '#6b7280',
              marginBottom: 4,
              fontSize: 11,
            }}
            itemStyle={{ color: '#e5e5e5', padding: 0 }}
            cursor={{ stroke: '#2a2a3d', strokeWidth: 1 }}
            labelFormatter={(label: unknown) => {
              const ts = typeof label === 'number' ? label : Number(label);
              return Number.isFinite(ts) ? formatTimeLong(ts) : '';
            }}
            formatter={(value: unknown) => {
              const n = typeof value === 'number' ? value : Number(value);
              const formatted = Number.isFinite(n)
                ? `$${n.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : '—';
              return [formatted, 'Price'];
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, stroke: lineColor, strokeWidth: 2, fill: '#0a0a0f' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LiveChart;

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppSelector } from '@store/hooks';
import { useTickerHistory } from '@hooks/useTickerHistory';
import { useTheme } from '@hooks/useTheme';
import type { IPricePoint } from '../../../app/api/types/ticker.types';

/**
 * Recharts needs raw hex strings for stroke / fill / grid color, so it
 * cannot consume Tailwind classes or CSS variables directly. We mirror
 * the theme palette here and switch on the active theme — kept in sync
 * with src/app.css.
 */
const CHART_PALETTE = {
  dark: {
    grid: '#1f1f2e',
    axis: '#6b7280',
    tooltipBg: '#12121a',
    tooltipBorder: '#1f1f2e',
    tooltipLabel: '#6b7280',
    tooltipText: '#e5e5e5',
    cursor: '#2a2a3d',
    activeDotFill: '#0a0a0f',
    neutral: '#00d4ff',
    up: '#00ff88',
    down: '#ff3366',
  },
  light: {
    grid: '#e2e8f0',
    axis: '#94a3b8',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipLabel: '#64748b',
    tooltipText: '#0f172a',
    cursor: '#cbd5e1',
    activeDotFill: '#ffffff',
    neutral: '#0284c7',
    up: '#16a34a',
    down: '#dc2626',
  },
} as const;

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
  const { theme } = useTheme();
  const palette = CHART_PALETTE[theme];

  // Seed local chart series whenever the historical fetch resolves (or
  // symbol changes). The chart maintains a sliding 300-point window of
  // local state — this is a legitimate "external store → local state"
  // bridge that the React 19 lint flags but cannot be replaced cleanly
  // by useMemo (a memo can't accumulate over time).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChartData(history.length > 0 ? history.map(toChartPoint) : []);
  }, [history, symbol]);

  // Append every new live tick for this symbol; cap at MAX_POINTS.
  // Same external-store → local-state bridge pattern as above.
  useEffect(() => {
    if (!tick || tick.symbol !== symbol) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Baseline reference price for this session.
  //
  // Derived from the live tick: `tick.price - tick.change` exactly equals
  // the simulator's session-open price for this symbol (the reference
  // point the backend uses to compute changePct). Drawing this line on
  // the chart means the visual coloring is guaranteed to agree with the
  // ticker row's coloring — above the line = green = positive %, below
  // the line = red = negative %.
  //
  // When no tick has arrived yet (initial paint), fall back to the
  // arithmetic mean of the visible historical points so the line still
  // renders somewhere reasonable.
  const baseline = useMemo(() => {
    if (tick) return Number((tick.price - tick.change).toFixed(2));
    if (chartData.length === 0) return null;
    const sum = chartData.reduce((acc, p) => acc + p.price, 0);
    return Number((sum / chartData.length).toFixed(2));
  }, [tick, chartData]);

  // Match the TickerRow's color so the chart and the row never disagree.
  // Both read from the same Redux slice → same source of truth → same hue.
  const lineColor = useMemo(() => {
    if (tick) return tick.changePct >= 0 ? palette.up : palette.down;
    if (chartData.length < 2) return palette.neutral;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    return last >= first ? palette.up : palette.down;
  }, [tick, chartData, palette]);

  const gradientId = `grad-${symbol}`;

  if (isLoading && chartData.length === 0) {
    return <ChartSkeleton palette={palette} />;
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[260px] sm:min-h-[360px] flex-col items-center justify-center gap-2 text-sm text-down">
        <span className="text-2xl">⚠</span>
        <span>Failed to load history</span>
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
            stroke={palette.grid}
            vertical={false}
          />
          <XAxis
            dataKey="ts"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke={palette.axis}
            fontSize={11}
            tickFormatter={formatTimeShort}
            minTickGap={60}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke={palette.axis}
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
              background: palette.tooltipBg,
              border: `1px solid ${palette.tooltipBorder}`,
              borderRadius: 6,
              fontSize: 12,
              padding: '8px 12px',
            }}
            labelStyle={{
              color: palette.tooltipLabel,
              marginBottom: 4,
              fontSize: 11,
            }}
            itemStyle={{ color: palette.tooltipText, padding: 0 }}
            cursor={{ stroke: palette.cursor, strokeWidth: 1 }}
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
          {baseline !== null && (
            <ReferenceLine
              y={baseline}
              stroke={palette.axis}
              strokeDasharray="4 4"
              strokeWidth={1}
              ifOverflow="extendDomain"
              label={{
                value: `$${baseline.toFixed(2)}`,
                position: 'right',
                fill: palette.tooltipLabel,
                fontSize: 10,
                offset: 6,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 4,
              stroke: lineColor,
              strokeWidth: 2,
              fill: palette.activeDotFill,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Animated SVG skeleton shown while the historical fetch is in flight.
 * Renders a faux gridded chart shape with a sweeping shimmer overlay so
 * the loading state has the same footprint as the real chart and feels
 * "alive" instead of an empty box.
 */
function ChartSkeleton({
  palette,
}: {
  palette: (typeof CHART_PALETTE)[Theme];
}) {
  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden rounded-md sm:min-h-[360px]">
      <svg
        className="h-full w-full"
        viewBox="0 0 600 240"
        preserveAspectRatio="none"
        aria-label="Loading chart"
      >
        {/* Horizontal grid lines */}
        {[40, 90, 140, 190].map((y) => (
          <line
            key={y}
            x1="0"
            x2="600"
            y1={y}
            y2={y}
            stroke={palette.grid}
            strokeDasharray="3 3"
          />
        ))}
        {/* Faux line + area */}
        <path
          d="M0,160 L60,140 L120,170 L180,130 L240,150 L300,110 L360,140 L420,90 L480,120 L540,80 L600,100 L600,240 L0,240 Z"
          fill={palette.grid}
          opacity="0.35"
        />
        <path
          d="M0,160 L60,140 L120,170 L180,130 L240,150 L300,110 L360,140 L420,90 L480,120 L540,80 L600,100"
          fill="none"
          stroke={palette.axis}
          strokeWidth="1.5"
          opacity="0.6"
        />
      </svg>
      {/* Shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-text-dim/10 to-transparent" />
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

type Theme = keyof typeof CHART_PALETTE;

export default LiveChart;

import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { markAllRead } from '@store/slices/triggeredAlertsSlice';
import { useAlerts } from '@hooks/useAlerts';
import type { IAlert } from '../../../app/api/types/alert.types';

/**
 * Bell icon in the dashboard header. Shows a red dot when there are
 * unread `alert:triggered` events streamed during the session, and opens
 * a dropdown listing the user's active + recently-triggered alerts.
 */
function AlertBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const unreadCount = useAppSelector((s) => s.triggeredAlerts.unreadCount);
  const { alerts, isLoading, remove } = useAlerts();

  // Click-outside close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const onToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      // Mark notifications as read when the dropdown is opened.
      if (next) dispatch(markAllRead());
      return next;
    });
  };

  const active = alerts.filter((a) => a.is_active);
  const triggered = alerts
    .filter((a) => !a.is_active)
    .sort((a, b) => {
      const aTs = a.triggered_at ? new Date(a.triggered_at).getTime() : 0;
      const bTs = b.triggered_at ? new Date(b.triggered_at).getTime() : 0;
      return bTs - aTs;
    });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded transition-colors',
          'text-text-dim hover:bg-surface-2 hover:text-text',
          open && 'bg-surface-2 text-text',
        )}
        aria-label="Alerts"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4 w-4 text-accent" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-down opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-down" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">
              Alerts
            </span>
            <span className="num text-[10px] text-text-dim">
              {alerts.length} total
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-6 text-center text-xs text-text-dim">
                Loading…
              </div>
            )}

            {!isLoading && alerts.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-6 w-6 text-text-dim" />
                <p className="text-xs text-text-dim">
                  No alerts yet. Click the bell on any ticker row to create one.
                </p>
              </div>
            )}

            {triggered.length > 0 && (
              <Section title="Triggered">
                {triggered.map((a) => (
                  <AlertRow key={a.id} alert={a} onRemove={remove} />
                ))}
              </Section>
            )}

            {active.length > 0 && (
              <Section title="Watching">
                {active.map((a) => (
                  <AlertRow key={a.id} alert={a} onRemove={remove} />
                ))}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="bg-surface-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {title}
      </div>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </div>
  );
}

function AlertRow({
  alert,
  onRemove,
}: {
  alert: IAlert;
  onRemove: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const onDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onRemove(alert.id);
    } finally {
      setBusy(false);
    }
  };

  const isAbove = alert.direction === 'above';
  const fired = !alert.is_active;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <div
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded',
            isAbove ? 'bg-up/15 text-up' : 'bg-down/15 text-down',
          )}
        >
          {isAbove ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight">
              {alert.symbol}
            </span>
            <span className="text-[10px] text-text-dim">
              {isAbove ? '≥' : '≤'} ${alert.price.toFixed(2)}
            </span>
          </div>
          {fired && alert.triggered_price !== null && (
            <span className="num text-[10px] text-accent">
              fired @ ${alert.triggered_price.toFixed(2)}
            </span>
          )}
          {!fired && alert.reference_price !== undefined && (
            <span className="num text-[10px] text-text-dim">
              from ${alert.reference_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded p-1 text-text-dim hover:bg-down/10 hover:text-down disabled:opacity-40"
        aria-label="Delete alert"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AlertBell;

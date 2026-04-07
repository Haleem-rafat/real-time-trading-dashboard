import { useEffect, useState } from 'react';
import { Bell, TrendingDown, TrendingUp, X } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { useAppSelector } from '@store/hooks';
import type { IAlertTriggeredEvent } from '../../../app/api/types/alert.types';

const TOAST_TTL_MS = 7_000;
const MAX_VISIBLE = 3;

/**
 * Watches the triggeredAlerts slice for new entries and displays them as
 * stacked toasts in the bottom-right corner. Each toast auto-dismisses
 * after TOAST_TTL_MS, and at most MAX_VISIBLE are shown at once.
 *
 * Visibility is *derived* during render from the Redux items list minus
 * a local `dismissed` set, so we never call setState in an effect body —
 * dismissals are written from inside the auto-dismiss timer callback,
 * which the React 19 effect rules allow.
 */
function AlertToastListener() {
  const items = useAppSelector((s) => s.triggeredAlerts.items);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Derive visible toasts directly from props/state — no setState in effect.
  const visible = items
    .filter((it) => !dismissedIds.has(it.alertId))
    .slice(0, MAX_VISIBLE);

  // Auto-dismiss the newest visible toast after the TTL elapses. setState
  // here lives inside the timer callback, not the effect body, so it
  // satisfies the React 19 set-state-in-effect rule.
  const newestKey = visible[0]?.alertId;
  useEffect(() => {
    if (!newestKey) return;
    const timer = setTimeout(() => {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(newestKey);
        return next;
      });
    }, TOAST_TTL_MS);
    return () => clearTimeout(timer);
  }, [newestKey]);

  const dismiss = (alertId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  };

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      {visible.map((toast) => (
        <Toast key={toast.alertId} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: IAlertTriggeredEvent;
  onDismiss: (alertId: string) => void;
}) {
  const isAbove = toast.direction === 'above';
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 max-w-[90vw] gap-3 rounded-lg border bg-surface px-4 py-3 shadow-2xl',
        isAbove ? 'border-up/40' : 'border-down/40',
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded',
          isAbove ? 'bg-up/15 text-up' : 'bg-down/15 text-down',
        )}
      >
        {isAbove ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">
            Alert triggered
          </span>
        </div>
        <p className="num mt-1 text-sm text-text">
          <span className="font-semibold">{toast.symbol}</span>{' '}
          <span className="text-text-dim">
            {isAbove ? 'crossed above' : 'dropped below'}
          </span>{' '}
          ${toast.threshold.toFixed(2)}
        </p>
        <p className="num mt-0.5 text-[11px] text-text-dim">
          Last price: ${toast.triggeredPrice.toFixed(2)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.alertId)}
        className="self-start rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AlertToastListener;

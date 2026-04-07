import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, TrendingUp, TrendingDown, Bell } from 'lucide-react';
import { cn } from '@/shadecn/lib/utils';
import { Button, MainInput } from '@UI/index';
import { useAlerts } from '@hooks/useAlerts';
import { useAppSelector } from '@store/hooks';
import type { TAlertDirection } from '../../../app/api/types/alert.types';

const schema = z.object({
  price: z
    .number({ message: 'Enter a price' })
    .positive('Price must be greater than 0'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  symbol: string;
  onClose: () => void;
}

/**
 * Always-open modal — the parent controls mount/unmount via conditional
 * rendering (`{open && <SetAlertModal ... />}`). This means each opening
 * is a fresh mount with fresh defaults, no reset effect needed.
 */
function SetAlertModal({ symbol, onClose }: Props) {
  const [direction, setDirection] = useState<TAlertDirection>('above');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { create } = useAlerts();
  const livePrice = useAppSelector(
    (s) => s.livePrices.bySymbol[symbol]?.price ?? null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { price: Number((livePrice ?? 0).toFixed(2)) },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await create({ symbol, direction, price: values.price });
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create alert';
      setSubmitError(msg);
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-accent-soft">
              <Bell className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text">
                Set price alert
              </h2>
              <p className="text-xs text-text-dim">
                Notify me when {symbol} crosses a level
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5">
          {livePrice !== null && (
            <div className="flex items-center justify-between rounded border border-border bg-surface-2 px-3 py-2 text-xs">
              <span className="text-text-dim">Current price</span>
              <span className="num font-medium text-text">
                ${livePrice.toFixed(2)}
              </span>
            </div>
          )}

          {/* Direction toggle */}
          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-dim">
              Direction
            </span>
            <div className="grid grid-cols-2 gap-2">
              <DirectionButton
                active={direction === 'above'}
                onClick={() => setDirection('above')}
                icon={<TrendingUp className="h-4 w-4" />}
                label="Above"
                color="up"
              />
              <DirectionButton
                active={direction === 'below'}
                onClick={() => setDirection('below')}
                icon={<TrendingDown className="h-4 w-4" />}
                label="Below"
                color="down"
              />
            </div>
          </div>

          {/* Price input */}
          <MainInput
            label="Threshold price (USD)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />

          {submitError && (
            <div className="rounded border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
            >
              Create alert
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DirectionButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'up' | 'down';
}

function DirectionButton({
  active,
  onClick,
  icon,
  label,
  color,
}: DirectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? color === 'up'
            ? 'border-up bg-up/15 text-up'
            : 'border-down bg-down/15 text-down'
          : 'border-border bg-surface-2 text-text-dim hover:text-text',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default SetAlertModal;

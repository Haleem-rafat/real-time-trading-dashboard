import { useEffect } from 'react';
import { useSocket } from '@hooks/useSocket';
import { useAppDispatch } from '@store/hooks';
import {
  seedLivePrices,
  updateLivePrice,
} from '@store/slices/livePricesSlice';
import { ESocketEvents } from '@constants/socket-events';
import type { IPriceTick } from '../app/api/types/ticker.types';

interface SubscribeAck {
  ok: boolean;
  snapshot?: Record<string, number>;
  error?: string;
}

/**
 * Subscribes the current socket connection to a list of ticker symbols
 * and dispatches every incoming `price:update` to Redux. Cleans up the
 * subscription and listener on unmount or when the symbols change.
 *
 * Pattern: declarative — pass the symbols you care about, and Redux
 * will be the single source of truth for live prices across the app.
 */
export function useLivePrices(symbols: string[]) {
  const { socket, isConnected } = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket || !isConnected || symbols.length === 0) return;

    const upper = symbols.map((s) => s.toUpperCase());

    socket.emit(
      ESocketEvents.SUBSCRIBE_TICKERS,
      { symbols: upper },
      (ack: SubscribeAck) => {
        if (ack?.ok && ack.snapshot) {
          dispatch(seedLivePrices(ack.snapshot));
        }
      },
    );

    const onPriceUpdate = (tick: IPriceTick) => {
      dispatch(updateLivePrice(tick));
    };

    socket.on(ESocketEvents.PRICE_UPDATE, onPriceUpdate);

    return () => {
      socket.off(ESocketEvents.PRICE_UPDATE, onPriceUpdate);
      // Best-effort unsubscribe — server will also clean up on disconnect
      for (const symbol of upper) {
        socket.emit(ESocketEvents.UNSUBSCRIBE_TICKER, { symbol });
      }
    };
    // We intentionally re-run only when the joined-symbol set changes,
    // not on every dispatch identity tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, symbols.join('|')]);
}

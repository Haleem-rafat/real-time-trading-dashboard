import { useEffect } from 'react';
import { mutate } from 'swr';
import { useAppDispatch } from '@store/hooks';
import { pushTriggered } from '@store/slices/triggeredAlertsSlice';
import { useSocket } from '@hooks/useSocket';
import { ESocketEvents } from '@constants/socket-events';
import { SWR_KEYS } from '@constants/keys';
import type { IAlertTriggeredEvent } from '../app/api/types/alert.types';

/**
 * Subscribes to the `alert:triggered` socket event for the lifetime of
 * the dashboard. Each event is pushed into Redux (so the bell badge
 * updates) and the SWR alerts cache is invalidated so the dropdown's
 * "active vs triggered" view stays consistent.
 *
 * Mounted once at the page level — same pattern as useLivePrices.
 */
export function useAlertNotifications() {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!socket) return;

    const handleAlertTriggered = (evt: IAlertTriggeredEvent) => {
      dispatch(pushTriggered(evt));
      // Force the alerts list to refetch so `is_active` flips to false
      // and `triggered_at`/`triggered_price` are populated.
      void mutate(SWR_KEYS.ALERTS);
    };

    socket.on(ESocketEvents.ALERT_TRIGGERED, handleAlertTriggered);

    return () => {
      socket.off(ESocketEvents.ALERT_TRIGGERED, handleAlertTriggered);
    };
  }, [socket, dispatch]);
}

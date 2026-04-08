import useSWR from 'swr';
import { SWR_KEYS } from '@constants/keys';
import { useAppSelector } from '@store/hooks';
import alertService from '@services/alert.service';
import type { IAlert, ICreateAlertPayload } from '../app/api/types/alert.types';

/**
 * Owns the user's alert list. Reads via SWR (with the standard cache),
 * and exposes optimistic create/remove helpers that revalidate the list.
 *
 * In guest mode the list fetch is skipped (alerts are a per-user feature
 * on a protected endpoint), and the returned list is always empty.
 */
export function useAlerts() {
  const isGuest = useAppSelector((s) => s.auth.isGuest);
  const { data, isLoading, error, mutate } = useSWR<IAlert[]>(
    isGuest ? null : SWR_KEYS.ALERTS,
    () => alertService.list(),
  );

  const create = async (payload: ICreateAlertPayload) => {
    const created = await alertService.create(payload);
    await mutate();
    return created;
  };

  const remove = async (id: string) => {
    await alertService.remove(id);
    await mutate();
  };

  return {
    alerts: data ?? [],
    isLoading,
    error,
    refetch: mutate,
    create,
    remove,
  };
}

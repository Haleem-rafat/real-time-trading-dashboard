import useSWR from 'swr';
import { SWR_KEYS } from '@constants/keys';
import tickerService from '@services/ticker.service';
import type { ITicker } from '../app/api/types/ticker.types';

export function useTickers() {
  const { data, isLoading, error, mutate } = useSWR<ITicker[]>(
    SWR_KEYS.TICKERS,
    () => tickerService.getAll(),
  );

  return {
    tickers: data ?? [],
    isLoading,
    error,
    refetch: mutate,
  };
}

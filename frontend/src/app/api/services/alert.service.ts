import api from '..';
import { EAPI } from '@constants/endpoints';
import type { IApiResponse } from '../types/api.types';
import type { IAlert, ICreateAlertPayload } from '../types/alert.types';

class AlertService {
  public async list(): Promise<IAlert[]> {
    const { data } = await api.get<IApiResponse<IAlert[]>>(EAPI.ALERTS);
    return data.data;
  }

  public async create(payload: ICreateAlertPayload): Promise<IAlert> {
    const { data } = await api.post<IApiResponse<IAlert>>(EAPI.ALERTS, payload);
    return data.data;
  }

  public async remove(id: string): Promise<void> {
    await api.delete(`${EAPI.ALERTS}/${id}`);
  }
}

export default Object.freeze(new AlertService());

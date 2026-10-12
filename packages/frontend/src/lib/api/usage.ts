import { ApiClient, apiClient } from './client';
import type { Page, Quota, UsageRecord } from './types';

export const fetchUsage = (client: ApiClient = apiClient): Promise<Page<UsageRecord>> => {
  return client.get<Page<UsageRecord>>('/usage');
};

export const fetchQuotas = (client: ApiClient = apiClient): Promise<Page<Quota>> => {
  return client.get<Page<Quota>>('/quotas');
};

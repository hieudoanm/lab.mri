import { ApiClient, apiClient } from './client';
import type { CurrentUser, IsoTimestamp } from './types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_at: IsoTimestamp;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export const fetchCurrentUser = (client: ApiClient = apiClient): Promise<CurrentUser> => {
  return client.get<CurrentUser>('/me');
};

export const login = (
  payload: LoginRequest,
  client: ApiClient = apiClient,
): Promise<AccessTokenResponse> => {
  return client.post<AccessTokenResponse>('/auth/login', { body: payload });
};

export const register = (
  payload: RegisterRequest,
  client: ApiClient = apiClient,
): Promise<CurrentUser> => {
  return client.post<CurrentUser>('/auth/register', { body: payload });
};

export const endSession = (client: ApiClient = apiClient): Promise<void> => {
  return client.post<void>('/auth/logout');
};

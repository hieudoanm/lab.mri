import { ApiClient, apiClient } from './client';
import type {
  Dataset,
  DatasetVersion,
  FileAsset,
  Page,
  UploadSession,
  UploadSessionCreateBody,
} from './types';

export interface DatasetListOptions {
  limit?: number;
  cursor?: string | null;
  projectId?: string;
}

export const fetchDatasets = (
  options: DatasetListOptions = {},
  client: ApiClient = apiClient,
): Promise<Page<Dataset>> => {
  const path = options.projectId ? `/projects/${options.projectId}/datasets` : '/datasets';
  return client.get<Page<Dataset>>(path, {
    query: { limit: options.limit, cursor: options.cursor },
  });
};

export const fetchProjectDatasets = (
  projectId: string,
  options: Omit<DatasetListOptions, 'projectId'> = {},
  client: ApiClient = apiClient,
): Promise<Page<Dataset>> => {
  return fetchDatasets({ ...options, projectId }, client);
};

export const fetchDataset = (
  datasetId: string,
  client: ApiClient = apiClient,
): Promise<Dataset> => {
  return client.get<Dataset>(`/datasets/${datasetId}`);
};

export const fetchDatasetVersions = (
  datasetId: string,
  client: ApiClient = apiClient,
): Promise<Page<DatasetVersion>> => {
  return client.get<Page<DatasetVersion>>(`/datasets/${datasetId}/versions`);
};

export const fetchDatasetAssets = (
  datasetVersionId: string,
  client: ApiClient = apiClient,
): Promise<Page<FileAsset>> => {
  return client.get<Page<FileAsset>>(`/dataset-versions/${datasetVersionId}/file-assets`);
};

export const createUploadSession = (
  datasetId: string,
  body: UploadSessionCreateBody,
  client: ApiClient = apiClient,
): Promise<UploadSession> => {
  return client.post<UploadSession>(`/datasets/${datasetId}/uploads`, { body });
};

export const fetchFileAssetDownloadUrl = (
  fileAssetId: string,
  client: ApiClient = apiClient,
): Promise<{ url: string; expires_at: string }> => {
  return client.get<{ url: string; expires_at: string }>(
    `/file-assets/${fileAssetId}/download-url`,
  );
};

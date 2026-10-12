import { ApiClient, apiClient } from './client';
import type { Page, Pipeline, PipelineVersion } from './types';

export interface PipelineListOptions {
  limit?: number;
  cursor?: string | null;
  projectId?: string;
}

export const fetchPipelines = (
  options: PipelineListOptions = {},
  client: ApiClient = apiClient,
): Promise<Page<Pipeline>> => {
  return client.get<Page<Pipeline>>('/pipelines', {
    query: { limit: options.limit, cursor: options.cursor, project_id: options.projectId },
  });
};

export const fetchPipeline = (
  pipelineId: string,
  client: ApiClient = apiClient,
): Promise<Pipeline> => {
  return client.get<Pipeline>(`/pipelines/${pipelineId}`);
};

export const fetchPipelineVersions = (
  pipelineId: string,
  client: ApiClient = apiClient,
): Promise<Page<PipelineVersion>> => {
  return client.get<Page<PipelineVersion>>(`/pipelines/${pipelineId}/versions`);
};

export const fetchPipelineVersion = (
  pipelineVersionId: string,
  client: ApiClient = apiClient,
): Promise<PipelineVersion> => {
  return client.get<PipelineVersion>(`/pipeline-versions/${pipelineVersionId}`);
};

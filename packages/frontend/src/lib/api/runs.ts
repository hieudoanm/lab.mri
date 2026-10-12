import { ApiClient, apiClient } from './client';
import type { Artifact, CreateRunBody, ExperimentRun, Page, RunLogLine, RunStatus } from './types';

export interface RunListOptions {
  limit?: number;
  cursor?: string | null;
  projectId?: string;
  status?: RunStatus;
  datasetVersionId?: string;
  pipelineVersionId?: string;
}

export const fetchRuns = (
  options: RunListOptions = {},
  client: ApiClient = apiClient,
): Promise<Page<ExperimentRun>> => {
  return client.get<Page<ExperimentRun>>('/runs', {
    query: {
      limit: options.limit,
      cursor: options.cursor,
      project_id: options.projectId,
      status: options.status,
      dataset_version_id: options.datasetVersionId,
      pipeline_version_id: options.pipelineVersionId,
    },
  });
};

export const fetchRun = (runId: string, client: ApiClient = apiClient): Promise<ExperimentRun> => {
  return client.get<ExperimentRun>(`/runs/${runId}`);
};

export const submitRun = (
  body: CreateRunBody,
  idempotencyKey: string,
  client: ApiClient = apiClient,
): Promise<ExperimentRun> => {
  return client.post<ExperimentRun>('/runs', { body, idempotencyKey });
};

export const cancelRun = (runId: string, client: ApiClient = apiClient): Promise<ExperimentRun> => {
  return client.post<ExperimentRun>(`/runs/${runId}/cancel`);
};

export const rerun = (runId: string, client: ApiClient = apiClient): Promise<ExperimentRun> => {
  return client.post<ExperimentRun>(`/runs/${runId}/rerun`);
};

export const fetchRunLogs = (
  runId: string,
  client: ApiClient = apiClient,
): Promise<Page<RunLogLine>> => {
  return client.get<Page<RunLogLine>>(`/runs/${runId}/logs`);
};

export const fetchRunArtifacts = (
  runId: string,
  client: ApiClient = apiClient,
): Promise<Page<Artifact>> => {
  return client.get<Page<Artifact>>(`/runs/${runId}/artifacts`);
};

export const fetchArtifactDownloadUrl = (
  artifactId: string,
  client: ApiClient = apiClient,
): Promise<{ url: string; expires_at: string }> => {
  return client.get<{ url: string; expires_at: string }>(`/artifacts/${artifactId}/download-url`);
};

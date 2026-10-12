import { ApiClient, apiClient } from './client';
import type {
  Page,
  ProjectCreateBody,
  ProjectMember,
  ProjectSummary,
  ProjectUpdateBody,
} from './types';

export interface ProjectListOptions {
  limit?: number;
  cursor?: string | null;
  search?: string;
  includeArchived?: boolean;
}

export const fetchProjects = (
  options: ProjectListOptions = {},
  client: ApiClient = apiClient,
): Promise<Page<ProjectSummary>> => {
  return client.get<Page<ProjectSummary>>('/projects', {
    query: {
      limit: options.limit,
      cursor: options.cursor,
      search: options.search,
      include_archived: options.includeArchived,
    },
  });
};

export const fetchProject = (
  projectId: string,
  client: ApiClient = apiClient,
): Promise<ProjectSummary> => {
  return client.get<ProjectSummary>(`/projects/${projectId}`);
};

export const createProject = (
  body: ProjectCreateBody,
  client: ApiClient = apiClient,
): Promise<ProjectSummary> => {
  return client.post<ProjectSummary>('/projects', { body });
};

export const updateProject = (
  projectId: string,
  body: ProjectUpdateBody,
  client: ApiClient = apiClient,
): Promise<ProjectSummary> => {
  return client.patch<ProjectSummary>(`/projects/${projectId}`, { body });
};

export const archiveProject = (
  projectId: string,
  client: ApiClient = apiClient,
): Promise<ProjectSummary> => {
  return client.patch<ProjectSummary>(`/projects/${projectId}`, {
    body: { archived_at: new Date().toISOString() },
  });
};

export const fetchProjectMembers = (
  projectId: string,
  client: ApiClient = apiClient,
): Promise<Page<ProjectMember>> => {
  return client.get<Page<ProjectMember>>(`/projects/${projectId}/members`);
};

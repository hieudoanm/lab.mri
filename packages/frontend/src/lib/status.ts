import type { StatusTone } from '@/components/atoms/status-badge';
import type {
  DatasetVersionStatus,
  PipelineVersionStatus,
  ProjectStatus,
  QuotaState,
  RunStatus,
} from '@/lib/api/types';

const RUN_TONES: Record<RunStatus, StatusTone> = {
  queued: 'neutral',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const RUN_LABELS: Record<RunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Succeeded',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const VERSION_TONES: Record<DatasetVersionStatus, StatusTone> = {
  created: 'neutral',
  validating: 'info',
  ready: 'success',
  failed: 'danger',
};

const VERSION_LABELS: Record<DatasetVersionStatus, string> = {
  created: 'Created',
  validating: 'Validating',
  ready: 'Ready',
  failed: 'Failed',
};

const PROJECT_TONES: Record<ProjectStatus, StatusTone> = {
  active: 'success',
  archived: 'neutral',
};

const PROJECT_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  archived: 'Archived',
};

const PIPELINE_VERSION_TONES: Record<PipelineVersionStatus, StatusTone> = {
  draft: 'warning',
  published: 'success',
  deprecated: 'neutral',
};

const PIPELINE_VERSION_LABELS: Record<PipelineVersionStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  deprecated: 'Deprecated',
};

const QUOTA_TONES: Record<QuotaState, StatusTone> = {
  within_quota: 'neutral',
  approaching_limit: 'warning',
  limit_reached: 'danger',
};

const QUOTA_LABELS: Record<QuotaState, string> = {
  within_quota: 'Within quota',
  approaching_limit: 'Approaching limit',
  limit_reached: 'Limit reached',
};

export const runStatusTone = (status: RunStatus): StatusTone => RUN_TONES[status];
export const runStatusLabel = (status: RunStatus): string => RUN_LABELS[status];

export const datasetVersionStatusTone = (status: DatasetVersionStatus): StatusTone =>
  VERSION_TONES[status];
export const datasetVersionStatusLabel = (status: DatasetVersionStatus): string =>
  VERSION_LABELS[status];

export const projectStatusOf = (archivedAt: string | null): ProjectStatus =>
  archivedAt ? 'archived' : 'active';
export const projectStatusTone = (status: ProjectStatus): StatusTone => PROJECT_TONES[status];
export const projectStatusLabel = (status: ProjectStatus): string => PROJECT_LABELS[status];

export const pipelineVersionStatusTone = (status: PipelineVersionStatus): StatusTone =>
  PIPELINE_VERSION_TONES[status];
export const pipelineVersionStatusLabel = (status: PipelineVersionStatus): string =>
  PIPELINE_VERSION_LABELS[status];

export const quotaStateTone = (state: QuotaState): StatusTone => QUOTA_TONES[state];
export const quotaStateLabel = (state: QuotaState): string => QUOTA_LABELS[state];

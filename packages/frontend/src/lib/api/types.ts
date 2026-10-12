/**
 * Domain types for the MRI Lab REST API (docs/07-api-spec.md) and data model
 * (docs/06-data-model.md).
 *
 * These mirror the server contract. JSON field names stay in `snake_case` so no
 * translation layer is required between the API and the UI.
 */

export type Uuid = string;

/** ISO 8601 timestamp with an explicit UTC offset, normally `Z`. */
export type IsoTimestamp = string;

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type ProjectVisibility = 'private' | 'public';

export type ProjectStatus = 'active' | 'archived';

export type DatasetSourceType = 'upload' | 'import' | 'sample';

export type DatasetVersionStatus = 'created' | 'validating' | 'ready' | 'failed';

export type UploadSessionStatus = 'pending' | 'completed' | 'expired' | 'aborted';

export type UploadMethod = 'backend' | 'signed_url';

export type PipelineVersionStatus = 'draft' | 'published' | 'deprecated';

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type QuotaState = 'within_quota' | 'approaching_limit' | 'limit_reached';

export type CoordinateSpace = 'voxel' | 'ras_mm' | 'mni152';

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ApiErrorDetail {
  field: string;
  code: string;
  message: string;
}

export interface CurrentUser {
  id: Uuid;
  email: string | null;
  display_name: string | null;
  created_at: IsoTimestamp;
}

export interface ProjectMember {
  project_id: Uuid;
  user_id: Uuid;
  role: ProjectRole;
  display_name: string | null;
  email: string | null;
  created_at: IsoTimestamp;
}

export interface Project {
  id: Uuid;
  owner_id: Uuid;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  archived_at: IsoTimestamp | null;
}

export interface ProjectSummary extends Project {
  role: ProjectRole;
  dataset_count: number;
  run_count: number;
}

export interface ProjectCreateBody {
  name: string;
  description?: string | null;
  visibility?: ProjectVisibility;
}

export interface ProjectUpdateBody {
  name?: string;
  description?: string | null;
  visibility?: ProjectVisibility;
  archived_at?: IsoTimestamp | null;
}

export interface SpatialMetadata {
  modality: string;
  dimensions: number[];
  voxel_spacing_mm: number[];
  orientation: string;
  data_type: string;
  affine: number[][];
}

export interface DatasetVersionManifest {
  schema_version: string;
  dataset_id: Uuid;
  dataset_version_id: Uuid;
  version: string;
  status: DatasetVersionStatus;
  created_at: IsoTimestamp;
  source: {
    source_type: DatasetSourceType;
    description: string | null;
  };
  spatial_metadata: SpatialMetadata;
}

export interface Dataset {
  id: Uuid;
  project_id: Uuid;
  name: string;
  source_type: DatasetSourceType;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  archived_at: IsoTimestamp | null;
  latest_version: DatasetVersion | null;
  version_count: number;
}

export interface DatasetVersion {
  id: Uuid;
  dataset_id: Uuid;
  version: string;
  status: DatasetVersionStatus;
  created_at: IsoTimestamp;
  checksum_sha256: string | null;
  manifest: DatasetVersionManifest | null;
}

export interface FileAsset {
  id: Uuid;
  dataset_version_id: Uuid;
  checksum: string;
  size_bytes: number;
  media_type: string;
  role: string | null;
  created_at: IsoTimestamp;
}

export interface UploadSession {
  upload_session_id: Uuid;
  status: UploadSessionStatus;
  upload_method: UploadMethod;
  upload_url: string;
  expires_at: IsoTimestamp;
}

export interface UploadSessionCreateBody {
  file_name: string;
  file_size_bytes: number;
  expected_checksum_sha256?: string | null;
  media_type?: string | null;
}

export interface Pipeline {
  id: Uuid;
  project_id: Uuid;
  name: string;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  latest_version: PipelineVersion | null;
  version_count: number;
  run_count: number;
}

export interface PipelineParameter {
  name: string;
  type: 'number' | 'integer' | 'boolean' | 'string' | 'enum';
  label: string;
  description?: string | null;
  unit?: string | null;
  default?: unknown;
  required?: boolean;
  minimum?: number | null;
  maximum?: number | null;
  options?: string[];
}

export interface PipelineVersion {
  id: Uuid;
  pipeline_id: Uuid;
  version: string;
  status: PipelineVersionStatus;
  image_digest: string;
  changelog: string | null;
  created_at: IsoTimestamp;
  parameters: PipelineParameter[];
}

export interface RunError {
  code: string;
  message: string;
}

export interface ExperimentRun {
  id: Uuid;
  project_id: Uuid;
  pipeline_id: Uuid;
  pipeline_name: string;
  pipeline_version: string;
  pipeline_version_id: Uuid;
  dataset_id: Uuid;
  dataset_name: string;
  dataset_version_id: Uuid;
  dataset_version: string;
  status: RunStatus;
  parameters: Record<string, unknown>;
  error: RunError | null;
  requested_at: IsoTimestamp;
  started_at: IsoTimestamp | null;
  finished_at: IsoTimestamp | null;
}

export interface Artifact {
  id: Uuid;
  run_id: Uuid;
  name: string;
  checksum: string;
  media_type: string;
  size_bytes: number;
  created_at: IsoTimestamp;
}

export interface RunLogLine {
  timestamp: IsoTimestamp;
  severity: 'debug' | 'info' | 'warning' | 'error';
  operation: string;
  message: string;
}

export interface Annotation {
  id: Uuid;
  project_id: Uuid;
  dataset_version_id: Uuid;
  coordinate_space: CoordinateSpace;
  coordinates: Record<string, number>;
  body: string;
  created_at: IsoTimestamp;
}

export interface UsageRecord {
  id: Uuid;
  resource_type: 'cpu_seconds' | 'storage_bytes' | 'runs';
  quantity: number;
  run_id: Uuid | null;
  created_at: IsoTimestamp;
}

export interface Quota {
  resource_type: 'storage_bytes' | 'cpu_seconds' | 'runs';
  limit: number;
  used: number;
  state: QuotaState;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
}

export interface CreateRunBody {
  pipeline_version_id: Uuid;
  dataset_version_id: Uuid;
  parameters: Record<string, unknown>;
}

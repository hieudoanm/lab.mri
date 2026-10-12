const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

const NUMBER = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 });

/** Format an ISO 8601 timestamp for display, always in UTC. */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return `${DATE_TIME.format(parsed)} UTC`;
};

/** Format a duration in seconds using a compact, human-readable form. */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '—';
  }
  if (seconds < 60) {
    return `${NUMBER.format(seconds)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes} min ${remainder} s`;
};

/** Format the elapsed time between two ISO timestamps. */
export const formatElapsed = (start: string | null, end: string | null): string => {
  if (!start) {
    return '—';
  }
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return '—';
  }
  return formatDuration((endMs - startMs) / 1000);
};

/** Format a finite number without discarding meaningful precision. */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return NUMBER.format(value);
};

/** Format a byte count using binary units. */
export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return '—';
  }
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${NUMBER.format(value)} ${units[unitIndex]}`;
};

/** Format a voxel dimension vector, e.g. `256 × 256 × 176`. */
export const formatDimensions = (dimensions: number[] | null | undefined): string => {
  if (!dimensions || dimensions.length === 0) {
    return '—';
  }
  return dimensions.map((dimension) => NUMBER.format(dimension)).join(' × ');
};

/** Format a voxel spacing vector in millimetres. */
export const formatSpacing = (spacing: number[] | null | undefined): string => {
  if (!spacing || spacing.length === 0) {
    return '—';
  }
  return `${spacing.map((value) => NUMBER.format(value)).join(' × ')} mm`;
};

/** Shorten a SHA-256 digest (with or without the `sha256:` prefix) for display. */
export const formatChecksum = (checksum: string | null | undefined): string => {
  if (!checksum) {
    return '—';
  }
  const digest = checksum.startsWith('sha256:') ? checksum.slice('sha256:'.length) : checksum;
  return digest.length <= 16 ? digest : `${digest.slice(0, 12)}…`;
};

/** Shorten an opaque identifier (UUID or run id) for compact display. */
export const formatIdentifier = (value: string | null | undefined): string => {
  if (!value) {
    return '—';
  }
  return value.length <= 12 ? value : `${value.slice(0, 8)}…`;
};

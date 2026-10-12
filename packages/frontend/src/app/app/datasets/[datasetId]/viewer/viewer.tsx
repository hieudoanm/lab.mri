'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState, type PointerEvent } from 'react';

import { buttonClasses } from '@/components/atoms/button';
import { Card } from '@/components/atoms/card';
import { MetadataGrid } from '@/components/atoms/metadata-grid';
import { ErrorState, LoadingState } from '@/components/atoms/states';
import { PageHeader } from '@/components/molecules/page-header';
import { fetchDataset, fetchDatasetVersions, toErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatSpacing } from '@/lib/format';

/** Placeholder volume geometry used until the imaging renderer is wired up. */
const DIMENSIONS = { x: 256, y: 256, z: 176 } as const;
const DEFAULT_COORDS = { x: 128, y: 118, z: 88 } as const;

type Axis = keyof typeof DIMENSIONS;
type Coords = Record<Axis, number>;

const OVERLAYS = [
  { id: 'atlas', label: 'Atlas labels', color: 'var(--color-atlas)' },
  { id: 'mask', label: 'Segmentation mask', color: 'var(--color-mask)' },
  { id: 'annotation', label: 'Annotations', color: 'var(--color-annotation)' },
] as const;

interface PlanePanelProps {
  label: string;
  sublabel: string;
  crosshairX: number;
  crosshairY: number;
  onPlace: (x: number, y: number) => void;
}

const PlanePanel = ({ label, sublabel, crosshairX, crosshairY, onPlace }: PlanePanelProps) => {
  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onPlace(
      Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
      Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
    );
  };

  return (
    <figure className='flex flex-col gap-2'>
      <figcaption className='flex items-baseline justify-between'>
        <span className='text-text-primary text-sm font-medium'>{label}</span>
        <span className='text-text-muted font-mono text-xs'>{sublabel}</span>
      </figcaption>
      <div
        role='img'
        aria-label={`${label} plane with crosshair at ${Math.round(crosshairX * 100)} percent by ${Math.round(
          crosshairY * 100,
        )} percent`}
        onClick={handlePointer}
        className='border-border bg-canvas relative aspect-square cursor-crosshair overflow-hidden rounded-lg border'>
        <svg viewBox='0 0 100 100' className='h-full w-full' aria-hidden='true'>
          <defs>
            <radialGradient id={`brain-${label}`} cx='50%' cy='48%' r='52%'>
              <stop offset='0%' stopColor='#2A3648' />
              <stop offset='70%' stopColor='#1A2230' />
              <stop offset='100%' stopColor='#0B0F14' />
            </radialGradient>
          </defs>
          <rect width='100' height='100' fill='#05080B' />
          <ellipse cx='50' cy='50' rx='38' ry='30' fill={`url(#brain-${label})`} />
          <path
            d='M50 20c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18Z'
            fill='#263244'
            opacity='0.5'
          />
          <ellipse cx='50' cy='52' rx='6' ry='14' fill='#35455C' opacity='0.6' />
          <line
            x1={crosshairX * 100}
            y1='0'
            x2={crosshairX * 100}
            y2='100'
            stroke='#7FB2FF'
            strokeWidth='0.6'
          />
          <line
            x1='0'
            y1={crosshairY * 100}
            x2='100'
            y2={crosshairY * 100}
            stroke='#7FB2FF'
            strokeWidth='0.6'
          />
          <circle cx={crosshairX * 100} cy={crosshairY * 100} r='1' fill='#7FB2FF' />
        </svg>
      </div>
    </figure>
  );
};

export const Viewer = ({
  datasetId,
  versionId,
}: {
  datasetId: string;
  versionId: string | null;
}) => {
  const dataset = useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => fetchDataset(datasetId),
  });
  const versions = useQuery({
    queryKey: ['dataset-versions', datasetId],
    queryFn: () => fetchDatasetVersions(datasetId),
  });
  const [coords, setCoords] = useState<Coords>({ ...DEFAULT_COORDS });
  const [activeOverlays, setActiveOverlays] = useState<string[]>(['annotation']);

  if (dataset.isLoading) {
    return <LoadingState label='Loading viewer…' />;
  }
  if (dataset.isError) {
    return <ErrorState message={toErrorMessage(dataset.error)} />;
  }

  const selected =
    versions.data?.items.find((version) => version.id === versionId) ??
    dataset.data?.latest_version ??
    null;
  const spatial = selected?.manifest?.spatial_metadata ?? null;

  const clamp = (axis: Axis, fraction: number) => {
    setCoords((current) => ({
      ...current,
      [axis]: Math.round(Math.min(Math.max(fraction, 0), 1) * (DIMENSIONS[axis] - 1)),
    }));
  };

  const toggleOverlay = (id: string) => {
    setActiveOverlays((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        title='Viewer'
        description={
          dataset.data ? `Read-only multiplanar preview of ${dataset.data.name}.` : undefined
        }
        breadcrumbs={[
          { label: 'Datasets', href: '/app/datasets' },
          { label: dataset.data?.name ?? 'Dataset', href: `/app/datasets/${datasetId}` },
          { label: 'Viewer' },
        ]}
        actions={
          <Link href={`/app/datasets/${datasetId}`} className={buttonClasses('ghost', 'sm')}>
            Back to dataset
          </Link>
        }
      />

      <div className='grid gap-4 lg:grid-cols-3'>
        <PlanePanel
          label='Axial'
          sublabel={`z = ${coords.z}`}
          crosshairX={coords.x / (DIMENSIONS.x - 1)}
          crosshairY={coords.y / (DIMENSIONS.y - 1)}
          onPlace={(x, y) => {
            clamp('x', x);
            clamp('y', y);
          }}
        />
        <PlanePanel
          label='Coronal'
          sublabel={`y = ${coords.y}`}
          crosshairX={coords.x / (DIMENSIONS.x - 1)}
          crosshairY={(DIMENSIONS.z - 1 - coords.z) / (DIMENSIONS.z - 1)}
          onPlace={(x, y) => {
            clamp('x', x);
            clamp('z', 1 - y);
          }}
        />
        <PlanePanel
          label='Sagittal'
          sublabel={`x = ${coords.x}`}
          crosshairX={coords.y / (DIMENSIONS.y - 1)}
          crosshairY={(DIMENSIONS.z - 1 - coords.z) / (DIMENSIONS.z - 1)}
          onPlace={(x, y) => {
            clamp('y', x);
            clamp('z', 1 - y);
          }}
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        <Card title='Crosshair' className='lg:col-span-2'>
          <MetadataGrid
            columns={3}
            items={[
              { label: 'Voxel', value: `${coords.x}, ${coords.y}, ${coords.z}`, mono: true },
              {
                label: 'RAS (mm)',
                value: spatial
                  ? `${((coords.x - DIMENSIONS.x / 2) * spatial.voxel_spacing_mm[0]).toFixed(1)}, ${(
                      (coords.y - DIMENSIONS.y / 2) *
                      spatial.voxel_spacing_mm[1]
                    ).toFixed(1)}, ${(
                      (coords.z - DIMENSIONS.z / 2) *
                      spatial.voxel_spacing_mm[2]
                    ).toFixed(1)}`
                  : '—',
                mono: true,
              },
              { label: 'Version', value: selected ? `v${selected.version}` : '—', mono: true },
            ]}
          />
          <p className='text-text-muted mt-4 text-xs'>
            Place a crosshair by clicking any plane. Views are linked, and every coordinate carries
            an explicit space.
          </p>
        </Card>

        <Card title='Layers & overlay'>
          <fieldset className='flex flex-col gap-3'>
            <legend className='sr-only'>Overlays</legend>
            {OVERLAYS.map((overlay) => (
              <label key={overlay.id} className='flex items-center gap-3 text-sm'>
                <input
                  type='checkbox'
                  className='checkbox checkbox-sm'
                  checked={activeOverlays.includes(overlay.id)}
                  onChange={() => toggleOverlay(overlay.id)}
                />
                <span
                  aria-hidden='true'
                  className='h-2.5 w-2.5 rounded-full'
                  style={{ background: overlay.color }}
                />
                <span className='text-text-secondary'>{overlay.label}</span>
              </label>
            ))}
          </fieldset>
          <p className={cn('text-text-muted mt-4 text-xs')}>
            {spatial
              ? `Spacing ${formatSpacing(spatial.voxel_spacing_mm)} · ${spatial.orientation}`
              : 'Spatial metadata is not available for this version.'}
          </p>
        </Card>
      </div>
    </div>
  );
};

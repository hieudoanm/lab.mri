import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState, ErrorState, LoadingState } from '@/components/atoms/states';

describe('states', () => {
  it('renders an empty state title and description', () => {
    render(<EmptyState title='No datasets yet' description='Upload a volume to begin.' />);
    expect(screen.getByRole('heading', { name: 'No datasets yet' })).toBeInTheDocument();
    expect(screen.getByText('Upload a volume to begin.')).toBeInTheDocument();
  });

  it('exposes an alert role for errors', () => {
    render(<ErrorState message='Dataset not found.' />);
    expect(screen.getByRole('alert')).toHaveTextContent('Dataset not found.');
  });

  it('exposes a status role while loading', () => {
    render(<LoadingState label='Loading projects…' />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading projects…');
  });
});

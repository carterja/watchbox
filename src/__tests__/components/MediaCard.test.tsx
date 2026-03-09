import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaCard } from '@/components/MediaCard';
import type { Media } from '@/types/media';

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

describe('MediaCard', () => {
  const mockOnStatusChange = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnUpdate = vi.fn();

  const mockMovie: Media = {
    id: 'movie-1',
    tmdbId: 12345,
    type: 'movie',
    title: 'Test Movie',
    overview: 'A thrilling test movie with amazing visuals.',
    posterPath: '/test.jpg',
    releaseDate: '2024-01-15',
    status: 'yet_to_start',
    progressNote: null,
    totalSeasons: null,
    seasonProgress: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockTVSeries: Media = {
    id: 'tv-1',
    tmdbId: 67890,
    type: 'tv',
    title: 'Test Series',
    overview: 'An exciting test series.',
    posterPath: '/test-tv.jpg',
    releaseDate: '2024-01-01',
    status: 'in_progress',
    progressNote: 'S2E5',
    totalSeasons: 3,
    seasonProgress: [
      { season: 1, status: 'completed' },
      { season: 2, status: 'in_progress' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render movie card with title', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByText('Test Movie')[0]).toBeInTheDocument();
  });

  it('should show MOVIE pill for movies', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Movie')).toBeInTheDocument();
  });

  it('should show SERIES pill for TV shows', () => {
    render(
      <MediaCard
        media={mockTVSeries}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  it('should display year from release date', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('should render overview text', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(
      screen.getByText(/A thrilling test movie with amazing visuals/)
    ).toBeInTheDocument();
  });

  it('should show all three status buttons', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Yet to start')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('should highlight current status', () => {
    render(
      <MediaCard
        media={mockTVSeries}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
      />
    );

    const inProgressButton = screen.getByText('In progress');
    expect(inProgressButton).toHaveClass('bg-shelf-accent');
  });

  it('should show season progress for TV series', () => {
    render(
      <MediaCard
        media={mockTVSeries}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    // Check for season indicators (S1 ✓, S2 ●)
    expect(screen.getByText(/S1/)).toBeInTheDocument();
    expect(screen.getByText(/S2/)).toBeInTheDocument();
  });

  it('should show "Track seasons" button for TV without season progress', () => {
    const tvWithoutProgress = { ...mockTVSeries, seasonProgress: null };
    render(
      <MediaCard
        media={tvWithoutProgress}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Track seasons')).toBeInTheDocument();
  });

  it('should show "Edit seasons" button for TV with season progress', () => {
    render(
      <MediaCard
        media={mockTVSeries}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Edit seasons')).toBeInTheDocument();
  });

  it('should not show season controls for movies', () => {
    render(
      <MediaCard
        media={mockMovie}
        onStatusChange={mockOnStatusChange}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.queryByText('Track seasons')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit seasons')).not.toBeInTheDocument();
  });
});

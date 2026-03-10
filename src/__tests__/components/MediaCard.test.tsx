import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaCard } from '@/components/MediaCard';
import type { Media } from '@/types/media';

// Mock next/image (strip fill/sizes so we don't pass non-DOM props to img)
vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; fill?: boolean; sizes?: string; [k: string]: unknown }) => {
    const { fill: _f, sizes: _s, ...imgProps } = rest as { fill?: boolean; sizes?: string; [k: string]: unknown };
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img src={src} alt={alt} {...imgProps} />;
  },
}));

// MediaDetailModal is heavy; mock it so card tests stay focused on the card
vi.mock('@/components/MediaDetailModal', () => ({
  MediaDetailModal: () => null,
}));

describe('MediaCard', () => {
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
    streamingService: null,
    viewer: null,
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
    streamingService: null,
    viewer: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render movie card with title', () => {
    render(<MediaCard media={mockMovie} onDelete={mockOnDelete} />);
    expect(screen.getAllByText('Test Movie')[0]).toBeInTheDocument();
  });

  it('should show MOVIE pill for movies', () => {
    render(<MediaCard media={mockMovie} onDelete={mockOnDelete} />);
    expect(screen.getByText('Movie')).toBeInTheDocument();
  });

  it('should show SERIES pill for TV shows', () => {
    render(<MediaCard media={mockTVSeries} onDelete={mockOnDelete} />);
    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  it('should display year from release date', () => {
    render(<MediaCard media={mockMovie} onDelete={mockOnDelete} />);
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('should show "Click to manage" hint on card', () => {
    render(<MediaCard media={mockMovie} onDelete={mockOnDelete} />);
    expect(screen.getByText('Click to manage')).toBeInTheDocument();
  });

  it('should not show season controls on card (they are in the detail modal)', () => {
    render(
      <MediaCard media={mockTVSeries} onDelete={mockOnDelete} onUpdate={mockOnUpdate} />
    );
    expect(screen.queryByText('Track seasons')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit seasons')).not.toBeInTheDocument();
  });

  it('should not show status buttons on card (they are in the detail modal)', () => {
    render(<MediaCard media={mockMovie} onDelete={mockOnDelete} />);
    expect(screen.queryByText('Yet to start')).not.toBeInTheDocument();
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
    expect(screen.queryByText('Finished')).not.toBeInTheDocument();
  });
});

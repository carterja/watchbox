import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeasonProgressEditor } from '@/components/SeasonProgressEditor';
import type { Media, SeasonProgressItem } from '@/types/media';

describe('SeasonProgressEditor', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const mockSeries: Media = {
    id: 'tv-1',
    tmdbId: 67890,
    type: 'tv',
    title: 'Test Series',
    overview: 'A test series',
    posterPath: '/test.jpg',
    releaseDate: '2024-01-01',
    runtime: null,
    status: 'in_progress',
    progressNote: null,
    totalSeasons: 3,
    seasonEpisodeCounts: null,
    seasonProgress: [
      { season: 1, status: 'completed' },
      { season: 2, status: 'in_progress' },
      { season: 3, status: 'not_started' },
    ],
    manualLastWatchedSeason: null,
    manualLastWatchedEpisode: null,
    streamingService: null,
    viewer: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  it('should render modal title with series name', () => {
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/Season progress — Test Series/)).toBeInTheDocument();
  });

  it('should show total seasons input with current value', () => {
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const input = screen.getByLabelText(/Total seasons/i) as HTMLInputElement;
    expect(input.value).toBe('3');
  });

  it('should render all season buttons', () => {
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/S1/)).toBeInTheDocument();
    expect(screen.getByText(/S2/)).toBeInTheDocument();
    expect(screen.getByText(/S3/)).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSave with correct data when Save is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await user.click(screen.getByText('Save'));

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(3, expect.any(Array));

    const [totalSeasons, seasonProgress] = mockOnSave.mock.calls[0];
    expect(totalSeasons).toBe(3);
    expect(seasonProgress).toHaveLength(3);
  });

  it('should update total seasons when input changes', async () => {
    const user = userEvent.setup();
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const input = screen.getByLabelText(/Total seasons/i);
    await user.clear(input);
    await user.type(input, '5');

    await waitFor(() => {
      expect(screen.getByText(/S5/)).toBeInTheDocument();
    });
  });

  it('should cycle season status on click', async () => {
    const user = userEvent.setup();
    render(
      <SeasonProgressEditor
        media={mockSeries}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const s3Button = screen.getByText(/S3/);
    
    // Initial: not_started (○)
    expect(s3Button.textContent).toContain('○');

    // Click once: in_progress (●)
    await user.click(s3Button);
    await waitFor(() => {
      expect(s3Button.textContent).toContain('●');
    });

    // Click twice: completed (✓)
    await user.click(s3Button);
    await waitFor(() => {
      expect(s3Button.textContent).toContain('✓');
    });

    // Click thrice: back to not_started (○)
    await user.click(s3Button);
    await waitFor(() => {
      expect(s3Button.textContent).toContain('○');
    });
  });

  it('should initialize with empty seasonProgress', () => {
    const seriesWithoutProgress = { ...mockSeries, seasonProgress: null, totalSeasons: 2 };
    render(
      <SeasonProgressEditor
        media={seriesWithoutProgress}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const s1Button = screen.getByText(/S1/);
    const s2Button = screen.getByText(/S2/);

    // All should start as not_started
    expect(s1Button.textContent).toContain('○');
    expect(s2Button.textContent).toContain('○');
  });
});

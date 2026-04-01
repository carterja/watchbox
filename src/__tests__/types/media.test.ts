import { describe, it, expect } from 'vitest';
import type { Media, MediaStatus, SeasonProgressItem } from '@/types/media';

describe('Media types', () => {
  it('should accept valid MediaStatus values', () => {
    const statuses: MediaStatus[] = ['yet_to_start', 'in_progress', 'finished', 'rewatch'];
    statuses.forEach((status) => {
      expect(['yet_to_start', 'in_progress', 'finished', 'rewatch']).toContain(status);
    });
  });

  it('should create valid Media object', () => {
    const media: Media = {
      id: 'test-id',
      tmdbId: 12345,
      type: 'movie',
      title: 'Test Movie',
      overview: 'A test movie',
      posterPath: '/test.jpg',
      releaseDate: '2024-01-01',
      runtime: null,
      status: 'yet_to_start',
      progressNote: null,
      totalSeasons: null,
      seasonEpisodeCounts: null,
      seasonProgress: null,
      manualLastWatchedSeason: null,
      manualLastWatchedEpisode: null,
      streamingService: null,
      viewer: null,
      sortOrder: 0,
      personalNotes: null,
      lastProgressSource: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(media.type).toBe('movie');
    expect(media.status).toBe('yet_to_start');
  });

  it('should create valid TV series with season progress', () => {
    const seasonProgress: SeasonProgressItem[] = [
      { season: 1, status: 'completed' },
      { season: 2, status: 'in_progress' },
      { season: 3, status: 'not_started' },
    ];

    const media: Media = {
      id: 'test-tv',
      tmdbId: 67890,
      type: 'tv',
      title: 'Test Series',
      overview: 'A test series',
      posterPath: '/test-tv.jpg',
      releaseDate: '2024-01-01',
      runtime: null,
      status: 'in_progress',
      progressNote: 'Watching S2E5',
      totalSeasons: 3,
      seasonEpisodeCounts: null,
      seasonProgress,
      manualLastWatchedSeason: null,
      manualLastWatchedEpisode: null,
      streamingService: null,
      viewer: null,
      sortOrder: 0,
      personalNotes: null,
      lastProgressSource: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    expect(media.type).toBe('tv');
    expect(media.totalSeasons).toBe(3);
    expect(media.seasonProgress).toHaveLength(3);
    expect(media.seasonProgress?.[0].status).toBe('completed');
  });
});

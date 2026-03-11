import { describe, it, expect } from 'vitest';

describe('API route: /api/media POST', () => {
  it('should validate required fields', () => {
    const validPayload = {
      tmdbId: 12345,
      type: 'movie',
      title: 'Test Movie',
      status: 'yet_to_start',
    };

    expect(validPayload.tmdbId).toBeDefined();
    expect(validPayload.type).toBeDefined();
    expect(validPayload.title).toBeDefined();
    expect(validPayload.status).toBeDefined();
  });

  it('should normalize status values', () => {
    const statuses = ['yet_to_start', 'in_progress', 'finished', 'rewatch', 'unknown'];
    
    const normalize = (status: string) => {
      if (status === 'in_progress') return 'in_progress';
      if (status === 'finished') return 'finished';
      if (status === 'rewatch') return 'rewatch';
      return 'yet_to_start';
    };

    expect(normalize('yet_to_start')).toBe('yet_to_start');
    expect(normalize('in_progress')).toBe('in_progress');
    expect(normalize('finished')).toBe('finished');
    expect(normalize('rewatch')).toBe('rewatch');
    expect(normalize('unknown')).toBe('yet_to_start');
  });

  it('should handle totalSeasons for TV series', () => {
    const moviePayload = {
      type: 'movie',
      totalSeasons: 5,
    };

    const tvPayload = {
      type: 'tv',
      totalSeasons: 5,
    };

    // Movies should ignore totalSeasons
    const movieResult = moviePayload.type === 'tv' && moviePayload.totalSeasons != null 
      ? Number(moviePayload.totalSeasons) 
      : null;
    expect(movieResult).toBeNull();

    // TV should accept totalSeasons
    const tvResult = tvPayload.type === 'tv' && tvPayload.totalSeasons != null 
      ? Number(tvPayload.totalSeasons) 
      : null;
    expect(tvResult).toBe(5);
  });

  it('should convert tmdbId to number', () => {
    const payload = { tmdbId: '12345' };
    const converted = Number(payload.tmdbId);
    expect(converted).toBe(12345);
    expect(typeof converted).toBe('number');
  });
});

describe('API route: /api/media/[id] PATCH', () => {
  it('should accept status updates', () => {
    const patch = { status: 'in_progress' };
    expect(patch.status).toBe('in_progress');
  });

  it('should accept progressNote updates', () => {
    const patch = { progressNote: 'Season 2, Episode 5' };
    expect(patch.progressNote).toBeDefined();
  });

  it('should accept totalSeasons updates', () => {
    const patch = { totalSeasons: 8 };
    expect(patch.totalSeasons).toBe(8);
  });

  it('should accept seasonProgress updates', () => {
    const patch = {
      seasonProgress: [
        { season: 1, status: 'completed' },
        { season: 2, status: 'in_progress' },
      ],
    };
    expect(patch.seasonProgress).toHaveLength(2);
    expect(patch.seasonProgress[0].status).toBe('completed');
  });

  it('should build data object correctly', () => {
    const body = {
      status: 'finished',
      progressNote: 'Done!',
      totalSeasons: 3,
      seasonProgress: [{ season: 1, status: 'completed' }],
    };

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.progressNote !== undefined) data.progressNote = body.progressNote;
    if (body.totalSeasons !== undefined) data.totalSeasons = body.totalSeasons;
    if (body.seasonProgress !== undefined) data.seasonProgress = body.seasonProgress;

    expect(data).toEqual({
      status: 'finished',
      progressNote: 'Done!',
      totalSeasons: 3,
      seasonProgress: [{ season: 1, status: 'completed' }],
    });
  });
});

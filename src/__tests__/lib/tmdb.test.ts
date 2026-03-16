import { describe, it, expect } from 'vitest';
import { posterUrl, isExternalPoster } from '@/lib/tmdb';

describe('TMDB utilities', () => {
  describe('posterUrl', () => {
    it('should return null for null path', () => {
      expect(posterUrl(null)).toBeNull();
    });

    it('should generate correct URL with default size', () => {
      const result = posterUrl('/abc123.jpg');
      expect(result).toBe('https://image.tmdb.org/t/p/w185/abc123.jpg');
    });

    it('should generate correct URL with custom size', () => {
      const result = posterUrl('/abc123.jpg', 'w342');
      expect(result).toBe('https://image.tmdb.org/t/p/w342/abc123.jpg');
    });

    it('should handle all size options', () => {
      const path = '/test.jpg';
      expect(posterUrl(path, 'w92')).toContain('/w92/');
      expect(posterUrl(path, 'w154')).toContain('/w154/');
      expect(posterUrl(path, 'w185')).toContain('/w185/');
      expect(posterUrl(path, 'w342')).toContain('/w342/');
    });

    it('should return external URLs as-is', () => {
      const url = 'https://example.com/poster.jpg';
      expect(posterUrl(url)).toBe(url);
      expect(posterUrl(url, 'w342')).toBe(url);
    });
  });

  describe('isExternalPoster', () => {
    it('should return false for null or TMDB paths', () => {
      expect(isExternalPoster(null)).toBe(false);
      expect(isExternalPoster('/abc.jpg')).toBe(false);
    });
    it('should return true for http/https URLs', () => {
      expect(isExternalPoster('https://example.com/p.jpg')).toBe(true);
      expect(isExternalPoster('http://example.com/p.jpg')).toBe(true);
    });
  });
});

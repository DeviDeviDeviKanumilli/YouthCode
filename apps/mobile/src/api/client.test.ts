import { describe, expect, it } from 'vitest';
import { API_BASE_URL, resolveApiUrl } from './client';

describe('api client helpers', () => {
  it('resolves backend-relative media URLs against the API base URL', () => {
    expect(resolveApiUrl('/media-files/observations/photo.jpg')).toBe(
      `${API_BASE_URL}/media-files/observations/photo.jpg`
    );
  });

  it('keeps absolute and file URLs unchanged', () => {
    expect(resolveApiUrl('https://example.test/photo.jpg')).toBe('https://example.test/photo.jpg');
    expect(resolveApiUrl('file:///tmp/photo.jpg')).toBe('file:///tmp/photo.jpg');
  });
});

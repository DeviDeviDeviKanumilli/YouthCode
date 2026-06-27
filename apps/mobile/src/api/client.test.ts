import { describe, expect, it } from 'vitest';
import { API_BASE_URL, ApiError, messageForError, resolveApiUrl } from './client';

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

  it('maps API failures to user-safe messages', () => {
    expect(
      messageForError(new ApiError('boom', 500, 'GET', '/health', 'traceback'), 'Fallback')
    ).toBe('EcoSentinel is having trouble reaching its ecological data services right now.');
    expect(messageForError(new ApiError('missing', 404, 'GET', '/x', '{}'), 'Fallback')).toBe(
      'This record could not be found. It may have been removed or is not available yet.'
    );
    expect(messageForError(new TypeError('Network request failed'), 'Fallback')).toContain(
      'could not reach the backend'
    );
  });
});

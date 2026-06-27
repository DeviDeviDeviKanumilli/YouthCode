import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../api/client';
import { firstEvidenceImageUrl, mediaEvidenceSummary } from './mediaEvidence';
import type { MediaRead } from '../types/report';

describe('media evidence helpers', () => {
  it('resolves the first backend-relative evidence image URL', () => {
    const media: MediaRead[] = [
      {
        id: 'media-1',
        observation_id: 'obs-1',
        file_type: 'image',
        mime_type: 'image/jpeg',
        storage_key: 'observations/photo.jpg',
        public_url: '/media-files/observations/photo.jpg',
      },
    ];

    expect(firstEvidenceImageUrl(media)).toBe(`${API_BASE_URL}/media-files/observations/photo.jpg`);
  });

  it('summarizes evidence media counts', () => {
    const media: MediaRead[] = [
      {
        id: 'media-1',
        observation_id: 'obs-1',
        file_type: 'image',
        mime_type: 'image/jpeg',
        storage_key: 'a.jpg',
        public_url: 'https://example.test/a.jpg',
        metadata_removed: true,
      },
      {
        id: 'media-2',
        observation_id: 'obs-1',
        file_type: 'audio',
        mime_type: 'audio/mpeg',
        storage_key: 'a.mp3',
      },
    ];

    expect(mediaEvidenceSummary(media)).toEqual({
      total: 2,
      imageCount: 1,
      metadataRemovedCount: 1,
    });
  });
});

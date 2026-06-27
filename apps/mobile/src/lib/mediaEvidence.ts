import { resolveApiUrl } from '../api/client';
import type { MediaRead } from '../types/report';

export function firstEvidenceImageUrl(media: MediaRead[]) {
  const image = media.find((item) => item.file_type === 'image' && item.public_url);
  return resolveApiUrl(image?.public_url);
}

export function mediaEvidenceSummary(media: MediaRead[]) {
  const imageCount = media.filter((item) => item.file_type === 'image').length;
  const metadataRemovedCount = media.filter((item) => item.metadata_removed).length;
  return {
    total: media.length,
    imageCount,
    metadataRemovedCount,
  };
}

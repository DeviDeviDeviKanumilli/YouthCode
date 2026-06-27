import { describe, expect, it } from 'vitest';
import {
  nextPipelineActionLabel,
  pipelineStatusTitle,
  pipelineStepLabel,
} from './pipelineStatus';
import type { PipelineStatusResponse } from '@/types/report';

describe('pipeline status helpers', () => {
  it('summarizes complete pipeline status for the result card', () => {
    const status: PipelineStatusResponse = {
      observation_id: 'obs-1',
      current_status: 'complete',
      completed_steps: ['identify_observation', 'enrich_observation'],
      failed_steps: [],
      next_available_user_action: 'review_results',
    };

    expect(pipelineStatusTitle(status)).toBe('Backend pipeline complete');
    expect(pipelineStepLabel(status.completed_steps[0])).toBe('identify observation');
    expect(nextPipelineActionLabel(status.next_available_user_action)).toBe(
      'Review the Sighting Intelligence Card.'
    );
  });

  it('uses calm retry-oriented copy for failed pipeline status', () => {
    const status: PipelineStatusResponse = {
      observation_id: 'obs-1',
      current_status: 'failed',
      completed_steps: [],
      failed_steps: [{ name: 'identify_observation', error: 'provider unavailable' }],
      next_available_user_action: 'review_error_and_retry_or_add_evidence',
    };

    expect(pipelineStatusTitle(status)).toBe('Backend pipeline needs attention');
    expect(nextPipelineActionLabel(status.next_available_user_action)).toBe(
      'Review the error, retry, or add more evidence.'
    );
  });
});

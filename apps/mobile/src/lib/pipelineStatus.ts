import type { PipelineStatusResponse } from '@/types/report';

export function pipelineStatusTitle(status: PipelineStatusResponse) {
  switch (status.current_status) {
    case 'complete':
      return 'Backend pipeline complete';
    case 'failed':
      return 'Backend pipeline needs attention';
    case 'running':
      return 'Backend pipeline running';
    case 'pending':
    default:
      return 'Backend pipeline pending';
  }
}

export function pipelineStepLabel(step: string) {
  return step
    .replace(/^run_/, '')
    .replace(/^start_/, '')
    .replaceAll('_', ' ');
}

export function nextPipelineActionLabel(action: string) {
  switch (action) {
    case 'review_results':
      return 'Review the Sighting Intelligence Card.';
    case 'review_error_and_retry_or_add_evidence':
      return 'Review the error, retry, or add more evidence.';
    case 'wait_for_pipeline_completion':
      return 'Wait for backend processing to finish.';
    case 'upload_media_and_start_pipeline':
      return 'Upload media evidence and start processing.';
    default:
      return action.replaceAll('_', ' ');
  }
}

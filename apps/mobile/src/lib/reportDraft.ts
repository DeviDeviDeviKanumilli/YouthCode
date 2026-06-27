import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReportAnswerState } from './reportAnswers';
import type { ObservationPrivacyLevel } from './privacy';
import type { ReportContext } from './reportContext';

const STORAGE_KEY = 'ecosentinel.mobile.reportDraft';

export type ReportDraftStage = 'confirm' | 'clues';

export type ReportDraft = {
  photoUri: string;
  stage: ReportDraftStage;
  answers: ReportAnswerState;
  privacyLevel: ObservationPrivacyLevel;
  reportContext: ReportContext;
  savedAt: string;
};

export async function loadReportDraft(): Promise<ReportDraft | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ReportDraft;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function saveReportDraft(draft: ReportDraft): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export async function clearReportDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function hasReportDraft(): Promise<boolean> {
  const draft = await loadReportDraft();
  return draft !== null;
}

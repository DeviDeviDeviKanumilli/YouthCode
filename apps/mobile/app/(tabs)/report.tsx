import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { messageForError } from '@/api/client';
import {
  createObservation,
  getIntelligenceCard,
  getPipelineStatus,
  identifyObservation,
  uploadObservationMedia,
} from '@/api/observations';
import { FALLBACK_COORDS, useBackendCoordinates, useLocalArea } from '@/location/LocationProvider';
import { useLocalUser } from '@/user/UserProvider';
import type { PipelineStatusResponse, SightingIntelligenceCard } from '@/types/report';
import {
  buildRawNoteFromContext,
  buildReportContext,
  habitatHintLabel,
  placeTypeLabel,
  readRouteParam,
  sourceLabel,
  type ReportContext,
} from '@/lib/reportContext';
import {
  buildReportHabitatAnswers,
  initialHabitatType,
  type HabitatTypeAnswer,
  type ReportAnswer,
  type ReportAnswerState,
} from '@/lib/reportAnswers';
import {
  DEFAULT_OBSERVATION_PRIVACY,
  privacyDescription,
  privacyTitle,
  type ObservationPrivacyLevel,
} from '@/lib/privacy';
import {
  nextPipelineActionLabel,
  pipelineStatusTitle,
  pipelineStepLabel,
} from '@/lib/pipelineStatus';
import { SightingIntelligenceCardContent } from '@/components/cards/SightingIntelligenceCardContent';
import { intelligenceCardTitle } from '@/lib/intelligenceCard';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Stage = 'camera' | 'confirm' | 'clues' | 'analyzing' | 'result';

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const area = useLocalArea();
  const coords = useBackendCoordinates();
  const user = useLocalUser();
  const params = useLocalSearchParams<{
    source?: string | string[];
    observationId?: string | string[];
    suggestedSpeciesName?: string | string[];
    placeType?: string | string[];
    habitatHint?: string | string[];
  }>();
  const reportContext = buildReportContext(params);
  const followUpObservationId = reportContext.observationId;

  const [stage, setStage] = useState<Stage>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ReportAnswerState>({
    near_water: readRouteParam(params.habitatHint) === 'near_water' ? 'yes' : 'not_sure',
    near_road_or_trail: 'not_sure',
    growth_pattern: 'not_sure',
    habitat_type: initialHabitatType(reportContext),
  });
  const [privacyLevel, setPrivacyLevel] = useState<ObservationPrivacyLevel>(DEFAULT_OBSERVATION_PRIVACY);
  const [result, setResult] = useState<SightingIntelligenceCard | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatusResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function capture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.82, skipProcessing: false });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setStage('confirm');
    }
  }

  async function analyze() {
    if (!photoUri) {
      setSubmitError('Take a photo before analyzing this sighting.');
      setStage('camera');
      return;
    }

    setStage('analyzing');
    setSubmitError(null);

    try {
      const location = area.coords ?? coords ?? FALLBACK_COORDS;
      const observation = await createObservation({
        user_id: user.userId ?? undefined,
        latitude: location.lat,
        longitude: location.lon,
        coordinate_uncertainty_m: area.locationGranted ? 35 : 5000,
        timestamp: new Date().toISOString(),
        privacy_level: privacyLevel,
        raw_note: buildRawNoteFromContext(reportContext),
        habitat_answers: buildReportHabitatAnswers(reportContext, answers),
      });

      const media = await uploadObservationMedia(observation.observation_id, photoUri);

      await identifyObservation(observation.observation_id, {
        media_id: media.id,
        provider_name: 'mock',
      });

      const card = await getIntelligenceCard(observation.observation_id);
      setResult(card);

      try {
        const status = await getPipelineStatus(observation.observation_id);
        setPipelineStatus(status);
      } catch {
        setPipelineStatus(null);
      }

      setStage('result');
    } catch (err) {
      setSubmitError(messageForError(err, 'Unable to submit this sighting.'));
      setStage('clues');
    }
  }

  if (!permission) {
    return <View style={styles.darkRoot} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <MaterialIcons name="photo-camera" size={42} color={colors.white} />
        <Text style={styles.permissionTitle}>Camera access is needed</Text>
        <Text style={styles.permissionBody}>EcoSentinel uses photos to create the sighting record and run the backend analysis flow.</Text>
        <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (stage === 'camera') {
    return (
      <View style={styles.cameraRoot}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={[styles.cameraTop, { paddingTop: insets.top + 10 }]}>
          <IconButton icon="close" onPress={() => router.back()} />
          <Text style={styles.cameraTitle}>New sighting</Text>
          <IconButton icon="my-location" onPress={() => void area.refresh()} />
        </View>
        <View style={[styles.cameraBottom, { paddingBottom: Math.max(insets.bottom + 24, 42) }]}>
          <View style={styles.locationPill}>
            <MaterialIcons name="location-on" size={16} color="#80A9FF" />
            <Text style={styles.locationPillText}>{area.locationGranted ? area.label : 'Location approximate'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Take photo" onPress={capture} style={styles.captureButton}>
            <View style={styles.captureInner} />
          </Pressable>
          <View style={styles.locationPillGhost} />
        </View>
      </View>
    );
  }

  if (stage === 'confirm' && photoUri) {
    return (
      <PhotoShell title="New sighting" photoUri={photoUri} onBack={() => setStage('camera')}>
        {user.userId ? <Text style={styles.sheetMeta}>Session ready</Text> : null}
        {followUpObservationId ? <Text style={styles.sheetMeta}>Follow-up for {followUpObservationId.slice(0, 8)}</Text> : null}
        <Text style={styles.sheetLabel}>Photo</Text>
        <Text style={styles.sheetTitle}>Use this photo?</Text>
        <Text style={styles.sheetBody}>You can retake it if the subject is unclear.</Text>
        <Pressable accessibilityRole="button" onPress={() => setStage('clues')} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Use photo</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setStage('camera')} style={styles.textButton}>
          <Text style={styles.textButtonText}>Retake</Text>
        </Pressable>
      </PhotoShell>
    );
  }

  if (stage === 'clues' && photoUri) {
    return (
      <PhotoShell title="New sighting" photoUri={photoUri} onBack={() => setStage('confirm')}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.clueContent}>
          <View style={styles.clueHeader}>
            <Image source={{ uri: photoUri }} style={styles.clueThumb} contentFit="cover" />
            <View style={styles.clueHeaderCopy}>
              <Text style={styles.sheetLabel}>Step 3 of 5</Text>
              <Text style={styles.sheetTitle}>Add a few clues</Text>
              <Text style={styles.sheetBody}>Not sure is always okay.</Text>
              {followUpObservationId ? <Text style={styles.sheetMeta}>Revisiting a previous sighting.</Text> : null}
            </View>
          </View>
          <ReportContextPanel context={reportContext} />
          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          <Question
            icon="water"
            title="Was it near water?"
            value={answers.near_water}
            options={['yes', 'no', 'not_sure']}
            onChange={(value) => setAnswers((current) => ({ ...current, near_water: value }))}
          />
          <Question
            icon="signpost"
            title="Was it near a road or trail?"
            value={answers.near_road_or_trail}
            options={['yes', 'no', 'not_sure']}
            onChange={(value) => setAnswers((current) => ({ ...current, near_road_or_trail: value }))}
          />
          <Question
            icon="grass"
            title="Was it alone or in a patch?"
            value={answers.growth_pattern}
            options={['alone', 'patch', 'not_sure']}
            onChange={(value) => setAnswers((current) => ({ ...current, growth_pattern: value }))}
          />
          <HabitatTypeQuestion
            value={answers.habitat_type}
            onChange={(value) => setAnswers((current) => ({ ...current, habitat_type: value }))}
          />
          <PrivacyQuestion value={privacyLevel} onChange={setPrivacyLevel} />
          <Pressable accessibilityRole="button" onPress={analyze} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Analyze sighting</Text>
          </Pressable>
        </ScrollView>
      </PhotoShell>
    );
  }

  if (stage === 'analyzing' && photoUri) {
    return (
      <PhotoShell title="Analyzing" photoUri={photoUri} onBack={() => setStage('clues')}>
        <View style={styles.analysisCard}>
          <Image source={{ uri: photoUri }} style={styles.analysisThumb} contentFit="cover" />
          <Text style={styles.analysisTitle}>Analyzing sighting...</Text>
          {['Reading photo', 'Checking nearby records', 'Looking at habitat clues', 'Preparing result'].map((step, index) => (
            <View key={step} style={styles.analysisRow}>
              {index < 3 ? (
                <MaterialIcons name="check-circle" size={22} color={colors.moss} />
              ) : (
                <ActivityIndicator size="small" color={colors.moss} />
              )}
              <Text style={styles.analysisStep}>{step}</Text>
            </View>
          ))}
        </View>
      </PhotoShell>
    );
  }

  if (stage === 'result' && photoUri && result) {
    return (
      <PhotoShell title="Result" photoUri={photoUri} onBack={() => setStage('clues')}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultContent}>
          <Image source={{ uri: photoUri }} style={styles.resultImage} contentFit="cover" />
          <View style={styles.resultBadge}>
            <MaterialIcons name="eco" size={16} color={colors.mossDark} />
            <Text style={styles.resultBadgeText}>Possible match</Text>
          </View>
          <Text style={styles.resultTitle}>{intelligenceCardTitle(result)}</Text>
          <SightingIntelligenceCardContent card={result} mode="compact" />
          {pipelineStatus ? <PipelineStatusCard status={pipelineStatus} /> : null}
          <Pressable accessibilityRole="button" onPress={() => router.replace('/sightings')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </ScrollView>
      </PhotoShell>
    );
  }

  return <View style={styles.darkRoot} />;
}

function PhotoShell({
  title,
  photoUri,
  onBack,
  children,
}: {
  title: string;
  photoUri: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.photoRoot}>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={stageBlur(title)} />
      <View style={styles.photoScrim} />
      <View style={[styles.photoTop, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="arrow-back" onPress={onBack} />
        <Text style={styles.cameraTitle}>{title}</Text>
        <View style={styles.iconButtonGhost} />
      </View>
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 18, 30) }]}>
        <View style={styles.handle} />
        {children}
      </View>
    </View>
  );
}

function Question({
  icon,
  title,
  value,
  options,
  onChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  value: ReportAnswer;
  options: ReportAnswer[];
  onChange: (value: ReportAnswer) => void;
}) {
  return (
    <View style={styles.questionCard}>
      <View style={styles.questionTitleRow}>
        <View style={styles.questionIcon}>
          <MaterialIcons name={icon} size={20} color={colors.moss} />
        </View>
        <Text style={styles.questionTitle}>{title}</Text>
      </View>
      <View style={styles.answerRow}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.answerButton, selected && styles.answerSelected]}>
              <Text style={[styles.answerText, selected && styles.answerSelectedText]}>{labelForAnswer(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HabitatTypeQuestion({
  value,
  onChange,
}: {
  value: HabitatTypeAnswer;
  onChange: (value: HabitatTypeAnswer) => void;
}) {
  const options: HabitatTypeAnswer[] = [
    'garden',
    'park',
    'forest',
    'roadside',
    'wetland',
    'unknown',
  ];

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionTitleRow}>
        <View style={styles.questionIcon}>
          <MaterialIcons name="terrain" size={20} color={colors.moss} />
        </View>
        <Text style={styles.questionTitle}>What kind of place was it?</Text>
      </View>
      <View style={styles.habitatGrid}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.habitatButton, selected && styles.answerSelected]}>
              <Text style={[styles.answerText, selected && styles.answerSelectedText]}>{labelForHabitatType(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PipelineStatusCard({ status }: { status: PipelineStatusResponse }) {
  return (
    <View style={styles.pipelineCard}>
      <View style={styles.pipelineHeader}>
        <View style={styles.pipelineIcon}>
          <MaterialIcons
            name={status.current_status === 'failed' ? 'error-outline' : 'sync'}
            size={20}
            color={status.current_status === 'failed' ? colors.red : colors.mossDark}
          />
        </View>
        <View style={styles.pipelineCopy}>
          <Text style={styles.pipelineEyebrow}>Processing status</Text>
          <Text style={styles.pipelineTitle}>{pipelineStatusTitle(status)}</Text>
        </View>
      </View>

      {status.completed_steps.length > 0 ? (
        <View style={styles.pipelineStepStack}>
          {status.completed_steps.map((step) => (
            <View key={step} style={styles.pipelineStepRow}>
              <MaterialIcons name="check-circle" size={16} color={colors.moss} />
              <Text style={styles.pipelineStepText}>{pipelineStepLabel(step)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {status.failed_steps.length > 0 ? (
        <View style={styles.pipelineStepStack}>
          {status.failed_steps.map((step) => (
            <View key={step.name} style={styles.pipelineStepRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.red} />
              <Text style={styles.pipelineStepText}>
                {pipelineStepLabel(step.name)}
                {step.error ? `: ${step.error}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.pipelineNext}>{nextPipelineActionLabel(status.next_available_user_action)}</Text>
    </View>
  );
}

function PrivacyQuestion({
  value,
  onChange,
}: {
  value: ObservationPrivacyLevel;
  onChange: (value: ObservationPrivacyLevel) => void;
}) {
  const options: ObservationPrivacyLevel[] = ['obscured', 'private', 'public'];

  return (
    <View style={styles.privacyCard}>
      <View style={styles.questionTitleRow}>
        <View style={styles.privacyIcon}>
          <MaterialIcons name="privacy-tip" size={20} color={colors.blue} />
        </View>
        <View style={styles.privacyTitleCopy}>
          <Text style={styles.questionTitle}>Location privacy</Text>
          <Text style={styles.privacyIntro}>You can keep precise coordinates out of public views.</Text>
        </View>
      </View>
      <View style={styles.privacyStack}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.privacyOption, selected && styles.privacySelected]}>
              <View style={styles.privacyOptionHeader}>
                <Text style={[styles.privacyOptionTitle, selected && styles.privacySelectedText]}>
                  {privacyTitle(option)}
                </Text>
                {selected ? <MaterialIcons name="check-circle" size={18} color={colors.blue} /> : null}
              </View>
              <Text style={styles.privacyOptionBody}>{privacyDescription(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


function ReportContextPanel({ context }: { context: ReportContext }) {
  const rows = [
    ['Source', sourceLabel(context.source)],
    ['Suggested species', context.suggestedSpeciesName],
    ['Species ID', context.suggestedSpeciesId],
    ['Place type', context.placeType ? placeTypeLabel(context.placeType) : undefined],
    ['Place ID', context.placeId],
    ['Habitat hint', context.habitatHint ? habitatHintLabel(context.habitatHint) : undefined],
    ['Follow-up', context.observationId ? context.observationId.slice(0, 8) : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  if (rows.length === 0 || (rows.length === 1 && context.source === 'manual')) {
    return null;
  }

  return (
    <View style={styles.contextPanel}>
      <View style={styles.contextHeader}>
        <MaterialIcons name="near-me" size={18} color={colors.blue} />
        <Text style={styles.contextTitle}>Report context</Text>
      </View>
      <View style={styles.contextRows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.contextRow}>
            <Text style={styles.contextLabel}>{label}</Text>
            <Text style={styles.contextValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function IconButton({ icon, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={24} color={colors.white} />
    </Pressable>
  );
}

function labelForAnswer(answer: ReportAnswer) {
  switch (answer) {
    case 'yes':
      return 'Yes';
    case 'no':
      return 'No';
    case 'alone':
      return 'Alone';
    case 'patch':
      return 'Patch';
    case 'not_sure':
    default:
      return 'Not sure';
  }
}

function labelForHabitatType(answer: HabitatTypeAnswer) {
  switch (answer) {
    case 'vacant_lot':
      return 'Vacant lot';
    case 'unknown':
      return 'Not sure';
    default:
      return answer.charAt(0).toUpperCase() + answer.slice(1);
  }
}

function stageBlur(title: string) {
  return title === 'Analyzing' ? 10 : 0;
}

const styles = StyleSheet.create({
  darkRoot: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  permissionTitle: {
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 26,
    textAlign: 'center',
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  permissionButtonText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  cameraRoot: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  cameraTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  cameraTitle: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonGhost: {
    width: 44,
    height: 44,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  cameraBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  locationPill: {
    minWidth: 118,
    maxWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  locationPillText: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  locationPillGhost: {
    width: 118,
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.blue,
    padding: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  captureInner: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  photoRoot: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  photoScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  photoTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '72%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.outline,
    marginBottom: 4,
  },
  sheetLabel: {
    color: colors.blue,
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sheetMeta: {
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
  },
  sheetBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: 8,
  },
  primaryText: {
    color: colors.white,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  textButtonText: {
    color: colors.blue,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  clueContent: {
    gap: 14,
    paddingBottom: 8,
  },
  clueHeader: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  clueThumb: {
    width: 92,
    height: 120,
    borderRadius: 18,
    backgroundColor: colors.surfaceDim,
  },
  clueHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  errorText: {
    color: colors.red,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    lineHeight: 19,
  },
  contextPanel: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 10,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  contextRows: {
    gap: 8,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  contextLabel: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  contextValue: {
    flex: 1.3,
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 13,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  questionCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  privacyCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E1E9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitleCopy: {
    flex: 1,
    gap: 2,
  },
  privacyIntro: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  privacyStack: {
    gap: 8,
  },
  privacyOption: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 5,
  },
  privacySelected: {
    borderColor: '#9BB3E8',
    backgroundColor: '#EEF4FF',
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  privacyOptionTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  privacySelectedText: {
    color: colors.blue,
  },
  privacyOptionBody: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  questionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  habitatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  answerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    paddingVertical: 9,
  },
  habitatButton: {
    minWidth: '30%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  answerSelected: {
    backgroundColor: colors.moss,
    borderColor: colors.moss,
  },
  answerText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  answerSelectedText: {
    color: colors.white,
  },
  analysisCard: {
    alignItems: 'stretch',
    gap: 16,
    paddingBottom: 12,
  },
  analysisThumb: {
    alignSelf: 'center',
    width: 138,
    height: 138,
    borderRadius: 22,
  },
  analysisTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 22,
    textAlign: 'center',
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: 12,
  },
  analysisStep: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  resultContent: {
    gap: 14,
    paddingBottom: 8,
  },
  resultImage: {
    width: '100%',
    height: 210,
    borderRadius: 24,
    backgroundColor: colors.surfaceDim,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: colors.mossSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  resultBadgeText: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resultTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultMetaText: {
    color: colors.muted,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  resultBody: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
    lineHeight: 22,
  },
  resultBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: 12,
    gap: 4,
  },
  pipelineCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 14,
    gap: 12,
  },
  pipelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pipelineIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mossSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipelineCopy: {
    flex: 1,
    gap: 2,
  },
  pipelineEyebrow: {
    color: colors.mossDark,
    fontFamily: fonts.label,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pipelineTitle: {
    color: colors.ink,
    fontFamily: fonts.bodySemibold,
    fontSize: 15,
  },
  pipelineStepStack: {
    gap: 8,
  },
  pipelineStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pipelineStepText: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'capitalize',
  },
  pipelineNext: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  resultBlockTitle: {
    color: colors.mossDark,
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
  },
  resultBlockText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});

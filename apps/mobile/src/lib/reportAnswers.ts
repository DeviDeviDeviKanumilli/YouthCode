import type { ReportContext } from './reportContext';

export type ReportAnswer = 'yes' | 'no' | 'not_sure' | 'alone' | 'patch';
export type HabitatTypeAnswer =
  | 'garden'
  | 'park'
  | 'forest'
  | 'vacant_lot'
  | 'roadside'
  | 'wetland'
  | 'unknown';

export type ReportAnswerState = {
  near_water: ReportAnswer;
  near_road_or_trail: ReportAnswer;
  growth_pattern: ReportAnswer;
  habitat_type: HabitatTypeAnswer;
};

export function backendAnswerValue(answer: ReportAnswer) {
  return answer === 'not_sure' ? 'unknown' : answer;
}

export function initialHabitatType(context: ReportContext): HabitatTypeAnswer {
  if (context.habitatHint === 'near_water') {
    return 'wetland';
  }

  switch (context.placeType) {
    case 'creek_edges':
    case 'wetland_edges':
      return 'wetland';
    case 'trail_entrances':
    case 'park_boundaries':
      return 'park';
    case 'street_trees':
      return 'roadside';
    case 'garden_edges':
      return 'garden';
    default:
      return 'unknown';
  }
}

export function buildReportHabitatAnswers(context: ReportContext, answers: ReportAnswerState) {
  return {
    source: context.source,
    watch_item_id: context.watchItemId,
    suggested_species_id: context.suggestedSpeciesId,
    suggested_species_name: context.suggestedSpeciesName,
    place_id: context.placeId,
    place_type: context.placeType,
    habitat_hint: context.habitatHint,
    follow_up_observation_id: context.observationId,
    near_water: backendAnswerValue(answers.near_water),
    near_road_or_trail: backendAnswerValue(answers.near_road_or_trail),
    growth_pattern: backendAnswerValue(answers.growth_pattern),
    habitat_type: answers.habitat_type,
  };
}

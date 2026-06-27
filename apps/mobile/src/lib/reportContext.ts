export type RouteParamValue = string | string[] | undefined;

export type ReportRouteParams = {
  source?: RouteParamValue;
  watchItemId?: RouteParamValue;
  suggestedSpeciesId?: RouteParamValue;
  suggestedSpeciesName?: RouteParamValue;
  placeId?: RouteParamValue;
  placeType?: RouteParamValue;
  habitatHint?: RouteParamValue;
  observationId?: RouteParamValue;
};

export type ReportContext = {
  source: string;
  watchItemId?: string;
  suggestedSpeciesId?: string;
  suggestedSpeciesName?: string;
  placeId?: string;
  placeType?: string;
  habitatHint?: string;
  observationId?: string;
};

export function readRouteParam(value: RouteParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function buildReportContext(params: ReportRouteParams): ReportContext {
  return {
    source: readRouteParam(params.source) ?? 'manual',
    watchItemId: readRouteParam(params.watchItemId),
    suggestedSpeciesId: readRouteParam(params.suggestedSpeciesId),
    suggestedSpeciesName: readRouteParam(params.suggestedSpeciesName),
    placeId: readRouteParam(params.placeId),
    placeType: readRouteParam(params.placeType),
    habitatHint: readRouteParam(params.habitatHint),
    observationId: readRouteParam(params.observationId),
  };
}

export function buildRawNoteFromContext(context: ReportContext) {
  if (context.suggestedSpeciesName) {
    return `Mobile report opened from ${context.source} for ${context.suggestedSpeciesName}.`;
  }
  if (context.placeType) {
    return `Mobile report opened from ${context.source} for ${placeTypeLabel(context.placeType)}.`;
  }
  return `Mobile report opened from ${context.source}.`;
}

export function sourceLabel(source: string) {
  switch (source) {
    case 'watch_item':
      return 'Watch item';
    case 'good_place':
      return 'Good place';
    case 'sighting_history':
      return 'Sighting history';
    case 'manual':
      return 'Manual report';
    default:
      return source.replaceAll('_', ' ');
  }
}

export function placeTypeLabel(type: string) {
  return type.replaceAll('_', ' ');
}

export function habitatHintLabel(hint: string) {
  return hint.replaceAll('_', ' ');
}

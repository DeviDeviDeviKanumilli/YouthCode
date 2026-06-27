export const DEMO_AREA_LABEL = 'Using demo area';
export const LOCATION_PERMISSION_DENIED_MESSAGE =
  'Using demo area until location permission is enabled.';

export function locationStatusDetail({
  granted,
  label,
  error,
}: {
  granted: boolean;
  label: string;
  error: string | null;
}) {
  if (error) {
    return error;
  }

  return granted ? label : DEMO_AREA_LABEL;
}

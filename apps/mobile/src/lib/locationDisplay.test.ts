import { describe, expect, it } from 'vitest';
import {
  DEMO_AREA_LABEL,
  LOCATION_PERMISSION_DENIED_MESSAGE,
  locationStatusDetail,
} from './locationDisplay';

describe('location display helpers', () => {
  it('uses demo area copy before location permission is granted', () => {
    expect(locationStatusDetail({ granted: false, label: 'Finding local area', error: null })).toBe(
      DEMO_AREA_LABEL
    );
  });

  it('surfaces permission errors without blocking the app', () => {
    expect(
      locationStatusDetail({
        granted: false,
        label: DEMO_AREA_LABEL,
        error: LOCATION_PERMISSION_DENIED_MESSAGE,
      })
    ).toBe(LOCATION_PERMISSION_DENIED_MESSAGE);
  });

  it('uses the resolved place label once permission is granted', () => {
    expect(locationStatusDetail({ granted: true, label: 'New York, NY', error: null })).toBe(
      'New York, NY'
    );
  });
});

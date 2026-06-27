import { useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import type { GeoJSONFeatureCollection } from '@/types/forecast';
import {
  mapLayerColors,
  parseGeoJsonLayers,
  regionForCoordinate,
} from '@/lib/geoJsonLayers';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1713' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ea0a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1713' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3530' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#172635' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#1a2a22' }] },
];

type ForecastGeoMapProps = {
  centerLat: number;
  centerLon: number;
  radiusKm: number;
  forecastCollection?: GeoJSONFeatureCollection | null;
  samplingCollection?: GeoJSONFeatureCollection | null;
  onObservationPress?: (observationId: string) => void;
};

export function ForecastGeoMap({
  centerLat,
  centerLon,
  radiusKm,
  forecastCollection,
  samplingCollection,
  onObservationPress,
}: ForecastGeoMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const initialRegion = useMemo(
    () => regionForCoordinate(centerLat, centerLon, radiusKm),
    [centerLat, centerLon, radiusKm]
  );

  const layers = useMemo(
    () => parseGeoJsonLayers([forecastCollection, samplingCollection]),
    [forecastCollection, samplingCollection]
  );

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        customMapStyle={Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        userInterfaceStyle="dark"
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        {layers.polygons.map((polygon) => {
          const colors = mapLayerColors(polygon.kind);
          return (
            <Polygon
              key={polygon.id}
              coordinates={polygon.coordinates}
              holes={polygon.holes}
              strokeColor={colors.stroke}
              fillColor={colors.fill}
              strokeWidth={1.5}
            />
          );
        })}

        {layers.lines.map((line) => {
          const colors = mapLayerColors(line.kind);
          return (
            <Polyline
              key={line.id}
              coordinates={line.coordinates}
              strokeColor={colors.stroke}
              strokeWidth={line.kind === 'waterways' ? 3 : 2}
            />
          );
        })}

        {layers.points.map((point) => {
          const colors = mapLayerColors(point.kind);
          const tappable = Boolean(point.observationId && onObservationPress);
          return (
            <Marker
              key={point.id}
              coordinate={point.coordinate}
              pinColor={colors.marker}
              onPress={
                tappable
                  ? () => {
                      if (point.observationId) {
                        onObservationPress?.(point.observationId);
                      }
                    }
                  : undefined
              }
            />
          );
        })}

        <Marker coordinate={{ latitude: centerLat, longitude: centerLon }} pinColor="#3B5B9E" />
      </MapView>
      <View style={styles.dimOverlay} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7,17,13,0.18)',
  },
});

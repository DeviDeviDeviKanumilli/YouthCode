import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import type { Observation } from './types';

interface ResearchMapProps {
  observations: Observation[];
  selected: Observation;
  layers?: MapLayerState;
  large?: boolean;
  samplingFocus?: boolean;
  onSelect: (id: string) => void;
}

export interface MapLayerState {
  verifiedRecords: boolean;
  unverifiedRecords: boolean;
  corridors: boolean;
  samplingGaps: boolean;
  waterways?: boolean;
  roadsAndTrails?: boolean;
}

const corridorA: L.LatLngExpression[] = [
  [40.52, -75.55],
  [40.72, -75.2],
  [40.94, -74.86],
  [41.12, -74.52],
];

const corridorB: L.LatLngExpression[] = [
  [40.22, -75.0],
  [40.44, -74.68],
  [40.7, -74.38],
  [40.98, -74.08],
];

const waterwayA: L.LatLngExpression[] = [
  [40.28, -75.12],
  [40.45, -74.98],
  [40.62, -74.79],
  [40.86, -74.54],
  [41.06, -74.24],
];

const trailA: L.LatLngExpression[] = [
  [40.36, -75.38],
  [40.58, -75.08],
  [40.72, -74.82],
  [40.86, -74.58],
];

const defaultLayers: MapLayerState = {
  verifiedRecords: true,
  unverifiedRecords: true,
  corridors: true,
  samplingGaps: true,
  waterways: true,
  roadsAndTrails: true,
};

export function ResearchMap({
  observations,
  selected,
  layers = defaultLayers,
  large = false,
  samplingFocus = false,
  onSelect,
}: ResearchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedRef = useRef(selected.id);
  selectedRef.current = selected.id;

  const bounds = useMemo(() => {
    const points = observations.map((item) => [item.latitude, item.longitude] as L.LatLngTuple);
    return points.length > 0 ? L.latLngBounds(points) : L.latLngBounds([[40.1, -75.7], [41.3, -73.9]]);
  }, [observations]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    L.control
      .attribution({
        prefix: false,
      })
      .addAttribution('OpenStreetMap')
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        layer.remove();
      }
    });

    if (layers.corridors) {
      L.polyline(corridorA, {
        color: '#0b6b43',
        dashArray: '8 7',
        opacity: 0.45,
        weight: 14,
      }).addTo(map);

      L.polyline(corridorB, {
        color: '#0b6b43',
        dashArray: '8 7',
        opacity: 0.38,
        weight: 12,
      }).addTo(map);
    }

    if (layers.waterways) {
      L.polyline(waterwayA, {
        color: '#356c9a',
        opacity: 0.42,
        weight: 5,
      }).addTo(map);
    }

    if (layers.roadsAndTrails) {
      L.polyline(trailA, {
        color: '#5f6c63',
        dashArray: '3 8',
        opacity: 0.5,
        weight: 3,
      }).addTo(map);
    }

    if (layers.samplingGaps) {
      [
        L.latLngBounds([40.62, -75.2], [40.82, -74.96]),
        L.latLngBounds([40.9, -74.92], [41.12, -74.62]),
        L.latLngBounds([40.35, -74.9], [40.56, -74.62]),
        L.latLngBounds([40.78, -75.45], [40.98, -75.18]),
        L.latLngBounds([40.18, -74.72], [40.4, -74.48]),
      ].forEach((gapBounds, index) => {
        L.rectangle(gapBounds, {
          color: index % 2 === 0 ? '#356c9a' : '#b86b00',
          dashArray: '4 5',
          fillColor: index % 2 === 0 ? '#e0edf7' : '#fff1d6',
          fillOpacity: samplingFocus ? 0.42 : 0.2,
          opacity: 0.68,
          weight: samplingFocus ? 2 : 1,
        }).addTo(map);
      });
    }

    const visibleObservations = observations.filter((item) => {
      const verified = item.verificationStatus === 'Expert verified' || item.verificationStatus === 'Field confirmed';
      return verified ? layers.verifiedRecords : layers.unverifiedRecords;
    });

    visibleObservations.forEach((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: L.divIcon({
          className: markerClass(item, item.id === selectedRef.current),
          html: '<span></span>',
          iconAnchor: [9, 9],
          iconSize: [18, 18],
        }),
      });

      marker
        .bindPopup(
          `<strong>${escapeHtml(item.commonName)}</strong><br>${escapeHtml(item.scientificName)}<br>${item.confidence}% identity confidence`,
        )
        .on('click', () => onSelect(item.id))
        .addTo(map);
    });

    if (visibleObservations.length > 1) {
      map.fitBounds(L.latLngBounds(visibleObservations.map((item) => [item.latitude, item.longitude])).pad(0.18), {
        animate: false,
      });
    } else if (visibleObservations[0]) {
      map.setView([visibleObservations[0].latitude, visibleObservations[0].longitude], 10);
    } else {
      map.fitBounds(bounds.pad(0.18), { animate: false });
    }
  }, [bounds, layers, observations, onSelect, samplingFocus, selected.id]);

  return (
    <div className={large ? 'research-map large' : 'research-map'}>
      <div ref={containerRef} className="leaflet-host" />
      <div className="map-legend">
        {layers.verifiedRecords && <span><i className="legend-dot verified" /> Expert verified</span>}
        {layers.unverifiedRecords && <span><i className="legend-dot pending" /> Needs verification</span>}
        {layers.corridors && <span><i className="legend-line" /> Potential spread corridor</span>}
        {layers.samplingGaps && <span><i className="legend-box" /> Sampling gap</span>}
        {layers.waterways && <span><i className="legend-waterway" /> Waterway</span>}
        {layers.roadsAndTrails && <span><i className="legend-trail" /> Roads/trails</span>}
      </div>
    </div>
  );
}

function markerClass(item: Observation, selected: boolean) {
  const status =
    item.verificationStatus === 'Expert verified' || item.verificationStatus === 'Field confirmed'
      ? 'verified'
      : item.signalLabel === 'Priority ecological signal'
        ? 'priority'
        : 'pending';

  return `ecosentinel-marker ${status}${selected ? ' selected' : ''}`;
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

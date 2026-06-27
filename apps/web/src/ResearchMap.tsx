import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  corridorPaths,
  defaultMapLayers,
  samplingGapBounds,
} from "./data";
import type { DashboardObservation, ForecastFeature, ForecastPayload, MapLayers } from "./types";

interface ResearchMapProps {
  observations: DashboardObservation[];
  selected: DashboardObservation;
  layers?: MapLayers;
  forecast?: ForecastPayload | null;
  large?: boolean;
  samplingFocus?: boolean;
  onSelect: (observationId: string) => void;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function markerClassName(observation: DashboardObservation, isSelected: boolean) {
  const statusClass =
    observation.verificationStatus === "Expert verified" ||
    observation.verificationStatus === "Field confirmed"
      ? "verified"
      : observation.signalLabel === "Priority ecological signal"
        ? "priority"
        : "pending";

  return `ecosentinel-marker ${statusClass}${isSelected ? " selected" : ""}`;
}

function layerEnabled(layers: MapLayers, layerName?: string) {
  switch (layerName) {
    case "verified_records":
      return layers.verifiedRecords;
    case "unverified_records":
    case "observations":
      return layers.unverifiedRecords;
    case "possible_corridors":
      return layers.corridors;
    case "sampling_gap_grid":
      return layers.samplingGaps;
    case "waterways":
      return layers.waterways;
    case "roads_trails":
      return layers.roadsAndTrails;
    default:
      return true;
  }
}

function addForecastFeature(map: L.Map, feature: ForecastFeature, layers: MapLayers) {
  const layerName = feature.properties.layer;
  if (!layerEnabled(layers, layerName)) {
    return;
  }

  if (feature.geometry.type === "LineString") {
    const coordinates = feature.geometry.coordinates as [number, number][];
    const isCorridor = layerName === "possible_corridors";
    L.polyline(
      coordinates.map(([lon, lat]) => [lat, lon] as [number, number]),
      {
        color: isCorridor ? "#0b6b43" : layerName === "waterways" ? "#356c9a" : "#5f6c63",
        dashArray: isCorridor ? "8 7" : layerName === "roads_trails" ? "3 8" : undefined,
        opacity: isCorridor ? 0.45 : 0.5,
        weight: isCorridor ? 12 : layerName === "waterways" ? 5 : 3,
      },
    ).addTo(map);
    return;
  }

  if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
    L.geoJSON(feature as GeoJSON.Feature, {
      style: {
        color: layerName === "sampling_gap_grid" ? "#356c9a" : "#b86b00",
        dashArray: "4 5",
        fillColor: "#e0edf7",
        fillOpacity: 0.22,
        opacity: 0.68,
        weight: 1,
      },
    }).addTo(map);
    return;
  }

  if (feature.geometry.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates as [number, number];
    const observationId = feature.properties.observation_id as string | undefined;
    const verified = layerName === "verified_records";
    L.marker([lat, lon], {
      icon: L.divIcon({
        className: `ecosentinel-marker ${verified ? "verified" : "pending"}`,
        html: "<span></span>",
        iconAnchor: [9, 9],
        iconSize: [18, 18],
      }),
    })
      .on("click", () => {
        if (observationId) {
          map.fire("ecosentinel:select", { observationId });
        }
      })
      .addTo(map);
  }
}

export default function ResearchMap({
  observations,
  selected,
  layers = defaultMapLayers,
  forecast = null,
  large = false,
  samplingFocus = false,
  onSelect,
}: ResearchMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedIdRef = useRef(selected.id);
  selectedIdRef.current = selected.id;

  const useApiForecast = Boolean(forecast?.features?.length);

  const fallbackBounds = useMemo(() => {
    const points = observations.map((row) => [row.latitude, row.longitude] as [number, number]);
    return points.length > 0
      ? L.latLngBounds(points)
      : L.latLngBounds([
          [40.1, -75.7],
          [41.3, -73.9],
        ]);
  }, [observations]);

  useEffect(() => {
    if (!hostRef.current || mapRef.current) {
      return;
    }

    const map = L.map(hostRef.current, {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);
    L.control
      .attribution({ prefix: false })
      .addAttribution("OpenStreetMap")
      .addTo(map);

    map.on("ecosentinel:select", (event: L.LeafletEvent & { observationId?: string }) => {
      if (event.observationId) {
        onSelect(event.observationId);
      }
    });

    mapRef.current = map;

    return () => {
      map.off("ecosentinel:select");
      map.remove();
      mapRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        return;
      }
      layer.remove();
    });

    if (useApiForecast && forecast) {
      for (const feature of forecast.features) {
        addForecastFeature(map, feature, layers);
      }
    } else {
      if (layers.corridors) {
        L.polyline(corridorPaths.primary, {
          color: "#0b6b43",
          dashArray: "8 7",
          opacity: 0.45,
          weight: 14,
        }).addTo(map);
        L.polyline(corridorPaths.secondary, {
          color: "#0b6b43",
          dashArray: "8 7",
          opacity: 0.38,
          weight: 12,
        }).addTo(map);
      }

      if (layers.waterways) {
        L.polyline(corridorPaths.waterways, {
          color: "#356c9a",
          opacity: 0.42,
          weight: 5,
        }).addTo(map);
      }

      if (layers.roadsAndTrails) {
        L.polyline(corridorPaths.roadsAndTrails, {
          color: "#5f6c63",
          dashArray: "3 8",
          opacity: 0.5,
          weight: 3,
        }).addTo(map);
      }

      if (layers.samplingGaps) {
        samplingGapBounds.forEach((bounds, index) => {
          L.rectangle(bounds, {
            color: index % 2 === 0 ? "#356c9a" : "#b86b00",
            dashArray: "4 5",
            fillColor: index % 2 === 0 ? "#e0edf7" : "#fff1d6",
            fillOpacity: samplingFocus ? 0.42 : 0.2,
            opacity: 0.68,
            weight: samplingFocus ? 2 : 1,
          }).addTo(map);
        });
      }
    }

    if (!useApiForecast) {
      const visibleObservations = observations.filter((row) =>
        row.verificationStatus === "Expert verified" ||
        row.verificationStatus === "Field confirmed"
          ? layers.verifiedRecords
          : layers.unverifiedRecords,
      );

      visibleObservations.forEach((row) => {
        const isSelected = row.id === selectedIdRef.current;
        L.marker([row.latitude, row.longitude], {
          icon: L.divIcon({
            className: markerClassName(row, isSelected),
            html: isSelected
              ? `<span class="score-marker">${Math.round(row.signalScore)}</span>`
              : "<span></span>",
            iconAnchor: isSelected ? [16, 16] : [9, 9],
            iconSize: isSelected ? [32, 32] : [18, 18],
          }),
        })
          .bindPopup(
            `<strong>${escapeHtml(row.commonName)}</strong><br>${escapeHtml(row.scientificName)}<br>${row.confidence}% identity confidence`,
          )
          .on("click", () => onSelect(row.id))
          .addTo(map);
      });

      if (visibleObservations.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            visibleObservations.map((row) => [row.latitude, row.longitude] as [number, number]),
          ).pad(0.18),
          { animate: false },
        );
      } else if (visibleObservations[0]) {
        map.setView([visibleObservations[0].latitude, visibleObservations[0].longitude], 10);
      } else {
        map.fitBounds(fallbackBounds.pad(0.18), { animate: false });
      }
    } else {
      map.fitBounds(fallbackBounds.pad(0.18), { animate: false });
    }
  }, [fallbackBounds, forecast, layers, observations, onSelect, samplingFocus, selected.id, useApiForecast]);

  return (
    <div className={large ? "research-map large" : "research-map"}>
      <div ref={hostRef} className="leaflet-host" />
      <div className="map-legend-bar" aria-label="Map legend">
        {layers.verifiedRecords ? (
          <span>
            <i className="legend-dot verified" /> Expert verified
          </span>
        ) : null}
        {layers.unverifiedRecords ? (
          <span>
            <i className="legend-dot pending" /> Needs verification
          </span>
        ) : null}
        {layers.corridors ? (
          <span>
            <i className="legend-line" /> Potential spread corridor
          </span>
        ) : null}
        {layers.samplingGaps ? (
          <span>
            <i className="legend-box" /> Sampling gap
          </span>
        ) : null}
        {layers.waterways ? (
          <span>
            <i className="legend-waterway" /> Waterway
          </span>
        ) : null}
        {layers.roadsAndTrails ? (
          <span>
            <i className="legend-trail" /> Roads/trails
          </span>
        ) : null}
      </div>
    </div>
  );
}

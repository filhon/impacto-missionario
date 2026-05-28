"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { ACTIVITY_TYPES, type ActivityType } from "@/types/domain";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type MapPoint = {
  lat: number;
  lng: number;
  activity_type: string;
  occurred_at: string;
};

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds: LatLngBoundsExpression = points.map(
      (p) => [p.lat, p.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export default function ActivityMap({ points }: { points: MapPoint[] }) {
  // Default center: Brazil
  const defaultCenter: [number, number] = [-14.235, -51.925];
  const defaultZoom = 4;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: "320px", width: "100%", borderRadius: "0.5rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map((point, i) => {
        const actType = point.activity_type as ActivityType;
        const color = ACTIVITY_TYPES[actType]?.color ?? "#6b7280";
        const label = ACTIVITY_TYPES[actType]?.label ?? point.activity_type;
        return (
          <CircleMarker
            key={i}
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{
              fillColor: color,
              color: "#fff",
              fillOpacity: 0.85,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                <strong>{label}</strong>
                <br />
                {format(new Date(point.occurred_at), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

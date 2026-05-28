"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
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
import { Maximize2, Minimize2 } from "lucide-react";

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

function InvalidateOnExpand({ expanded }: { expanded: boolean }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 50);
  }, [map, expanded]);
  return null;
}

export default function ActivityMap({ points }: { points: MapPoint[] }) {
  const defaultCenter: [number, number] = [-14.235, -51.925];
  const defaultZoom = 4;
  const [expanded, setExpanded] = useState(false);

  const mapElement = (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: expanded ? "0" : "0.5rem",
      }}
      scrollWheelZoom={expanded}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={points} />
      <InvalidateOnExpand expanded={expanded} />
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

  if (expanded) {
    return (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999 }}
        className="bg-background"
      >
        <div style={{ position: "absolute", height: "100%", width: "100%" }}>
          {mapElement}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="absolute right-3 top-3 z-10000 flex size-9 items-center justify-center rounded-lg bg-background/90 shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          aria-label="Recolher mapa"
        >
          <Minimize2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: "320px" }}>
      {mapElement}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute right-2 top-2 z-1000 flex size-9 items-center justify-center rounded-lg bg-background/90 shadow-md backdrop-blur-sm transition-colors hover:bg-background"
        aria-label="Expandir mapa"
      >
        <Maximize2 className="size-4" />
      </button>
    </div>
  );
}

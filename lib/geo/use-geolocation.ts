"use client";

import { useEffect, useState } from "react";
import { reverseGeocode } from "./reverse-geocode";

export type GeoState = {
  lat: number | null;
  lng: number | null;
  neighborhood: string;
  city: string;
  streetAddress: string;
  loading: boolean;
  denied: boolean;
};

const initial: GeoState = {
  lat: null,
  lng: null,
  neighborhood: "",
  city: "",
  streetAddress: "",
  loading: true,
  denied: false,
};

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>(initial);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ ...initial, loading: false, denied: true });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const geo = await reverseGeocode(lat, lng);
          setState({
            lat,
            lng,
            neighborhood: geo.neighborhood,
            city: geo.city,
            streetAddress: geo.streetAddress,
            loading: false,
            denied: false,
          });
        } catch {
          setState({ ...initial, lat, lng, loading: false });
        }
      },
      () => {
        setState({ ...initial, loading: false, denied: true });
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  }, []);

  return state;
}

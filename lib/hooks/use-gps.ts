import { useState, useEffect } from "react";

export function useGps() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {},
      { timeout: 5000, enableHighAccuracy: false },
    );
  }, []);

  return { lat, lng };
}

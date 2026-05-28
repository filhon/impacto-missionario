interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  road?: string;
  house_number?: string;
}

export interface GeocodeResult {
  neighborhood: string;
  city: string;
  streetAddress: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pt-BR`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ImpactoMissionario/1.0" },
  });
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);

  const data = await res.json();
  const addr: NominatimAddress = data.address ?? {};

  const neighborhood = addr.suburb ?? addr.neighbourhood ?? addr.village ?? "";
  const city = addr.city ?? addr.town ?? addr.municipality ?? "";
  const streetAddress = [addr.road, addr.house_number]
    .filter(Boolean)
    .join(", ");

  return { neighborhood, city, streetAddress };
}

import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

const EARTH_RADIUS_MILES = 3958.8;

/** Straight-line distance between two points, in miles. */
export const distanceMiles = (a: Coords, b: Coords) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
};

export const formatMiles = (miles: number) =>
  miles < 0.1 ? 'Here' : miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;

export const hasCoords = (v: { latitude?: number | null; longitude?: number | null }): v is Coords =>
  typeof v.latitude === 'number' && typeof v.longitude === 'number';

/**
 * Asks for "While Using" location access if needed and returns the current position,
 * or null if the member said no or the position couldn't be found.
 */
export const getCurrentCoords = async (): Promise<Coords | null> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 1000 });
    const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return null;
  }
};

/** Looks up a typed place ("Lake Travis Marina") and returns its coordinates, or null. */
export const geocodePlace = async (place: string): Promise<Coords | null> => {
  if (!place.trim()) return null;
  try {
    const [match] = await Location.geocodeAsync(place);
    return match ? { latitude: match.latitude, longitude: match.longitude } : null;
  } catch {
    return null;
  }
};

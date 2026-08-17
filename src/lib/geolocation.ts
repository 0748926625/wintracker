export interface GeoPoint {
  latitude: number
  longitude: number
}

/**
 * Capture ponctuelle de la position GPS du livreur. Ne bloque jamais l'action
 * métier : renvoie null si la géolocalisation est indisponible, refusée, ou trop lente.
 */
export function getCurrentLocation(timeoutMs = 8000): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

export function googleMapsUrl(point: GeoPoint): string {
  return `https://www.google.com/maps?q=${point.latitude},${point.longitude}`
}

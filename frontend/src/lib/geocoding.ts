export async function geocodeAddress(adresse: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!adresse || adresse.trim() === '') return null;

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const features = data.features || [];
      if (features.length > 0) {
        const coords = features[0]?.geometry?.coordinates; // [longitude, latitude]
        if (coords && coords.length >= 2) {
          return {
            longitude: coords[0],
            latitude: coords[1],
          };
        }
      }
    }
  } catch (err) {
    console.error(`Erreur lors du géocodage de l'adresse "${adresse}":`, err);
  }
  return null;
}

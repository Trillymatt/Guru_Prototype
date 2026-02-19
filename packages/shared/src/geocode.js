/**
 * Geocode an address string to lat/lng using OpenStreetMap Nominatim.
 * Free, no API key required. Rate limited to 1 request per second.
 *
 * @param {string} address - The address to geocode
 * @returns {Promise<{ lat: number, lng: number }|null>}
 */
export async function geocodeAddress(address) {
    if (!address) return null;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) return null;

        const results = await response.json();
        if (results.length > 0) {
            return {
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
            };
        }
    } catch (err) {
        console.error('Geocoding failed:', err.message);
    }

    return null;
}

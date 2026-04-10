const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastRequestTime = 0;

/**
 * Geocode an address string to lat/lng using OpenStreetMap Nominatim.
 * Free, no API key required. Rate limited to 1 request per second.
 *
 * @param {string} address - The address to geocode
 * @returns {Promise<{ lat: number, lng: number }|null>}
 */
export async function geocodeAddress(address) {
    if (!address || typeof address !== 'string') return null;

    // Limit address length to prevent abuse
    const trimmed = address.trim().slice(0, 300);
    if (trimmed.length < 3) return null;

    // Enforce Nominatim rate limit (1 req/sec)
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&q=${encodeURIComponent(trimmed)}&limit=1&countrycodes=us`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'GuruMobileRepair/1.0',
                },
                signal: controller.signal,
            }
        );

        clearTimeout(timeout);

        if (!response.ok) return null;

        const results = await response.json();
        if (results.length > 0) {
            return {
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
            };
        }
    } catch (err) {
        // Silently fail — caller receives null
    }

    return null;
}

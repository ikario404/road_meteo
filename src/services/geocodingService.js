/**
 * Geocoding Service — Nominatim (OpenStreetMap)
 * Free, no API key required
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/**
 * Search for addresses matching a query
 * @param {string} query
 * @returns {Promise<Array>} List of suggestions with coordinates
 */
export async function searchAddress(query) {
    if (!query || query.length < 3) return [];

    const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        'accept-language': 'fr'
    });

    try {
        const response = await fetch(`${NOMINATIM_URL}/search?${params}`);

        if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

        const data = await response.json();

        return data.map(item => ({
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type,
            shortName: buildShortName(item)
        }));
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Reverse geocode coordinates to get a place name
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>} Place name
 */
export async function reverseGeocode(lat, lng) {
    const params = new URLSearchParams({
        lat: lat.toFixed(6),
        lon: lng.toFixed(6),
        format: 'json',
        'accept-language': 'fr',
        zoom: '10'
    });

    try {
        const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`);

        if (!response.ok) return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

        const data = await response.json();
        return data.address?.city || data.address?.town || data.address?.village || data.display_name?.split(',')[0] || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch {
        return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
}

function buildShortName(item) {
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village || addr.municipality || '';
    const state = addr.state || '';
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    return item.display_name?.split(',').slice(0, 2).join(',') || '';
}

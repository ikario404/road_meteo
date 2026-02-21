/**
 * Route Utilities
 * Functions for sampling points along a route and weather code mapping
 */

/**
 * Calculate distance between two lat/lng points in km (Haversine formula)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Sample evenly-spaced points along a route polyline
 * @param {Array<{lat: number, lng: number}>} coords - Route coordinates
 * @param {number} intervalKm - Distance between sample points (default 30 km)
 * @returns {Array<{lat: number, lng: number, distanceKm: number}>}
 */
export function sampleRoutePoints(coords, intervalKm = 30) {
    if (!coords || coords.length < 2) return [];

    const points = [];
    let accumulatedDist = 0;
    let nextSampleDist = 0;

    // Always include the start point
    points.push({ lat: coords[0].lat, lng: coords[0].lng, distanceKm: 0 });

    for (let i = 1; i < coords.length; i++) {
        const segmentDist = haversineDistance(
            coords[i - 1].lat, coords[i - 1].lng,
            coords[i].lat, coords[i].lng
        );

        const prevAccum = accumulatedDist;
        accumulatedDist += segmentDist;

        // Check if we passed a sample point in this segment
        while (nextSampleDist + intervalKm <= accumulatedDist) {
            nextSampleDist += intervalKm;
            // Interpolate position within segment
            const ratio = (nextSampleDist - prevAccum) / segmentDist;
            const lat = coords[i - 1].lat + ratio * (coords[i].lat - coords[i - 1].lat);
            const lng = coords[i - 1].lng + ratio * (coords[i].lng - coords[i - 1].lng);
            points.push({ lat, lng, distanceKm: Math.round(nextSampleDist) });
        }
    }

    // Always include the end point
    const lastCoord = coords[coords.length - 1];
    const totalDist = Math.round(accumulatedDist);
    if (points[points.length - 1].distanceKm !== totalDist) {
        points.push({ lat: lastCoord.lat, lng: lastCoord.lng, distanceKm: totalDist });
    }

    return points;
}

/**
 * WMO Weather interpretation codes → label + emoji
 * Source: https://open-meteo.com/en/docs
 */
const WMO_CODES = {
    0: { label: 'Ciel dégagé', emoji: '☀️', severity: 'clear' },
    1: { label: 'Principalement dégagé', emoji: '🌤️', severity: 'clear' },
    2: { label: 'Partiellement nuageux', emoji: '⛅', severity: 'clear' },
    3: { label: 'Couvert', emoji: '☁️', severity: 'cloudy' },
    45: { label: 'Brouillard', emoji: '🌫️', severity: 'fog' },
    48: { label: 'Brouillard givrant', emoji: '🌫️', severity: 'fog' },
    51: { label: 'Bruine légère', emoji: '🌦️', severity: 'rain' },
    53: { label: 'Bruine modérée', emoji: '🌦️', severity: 'rain' },
    55: { label: 'Bruine dense', emoji: '🌧️', severity: 'rain' },
    56: { label: 'Bruine verglaçante légère', emoji: '🌧️', severity: 'ice' },
    57: { label: 'Bruine verglaçante dense', emoji: '🌧️', severity: 'ice' },
    61: { label: 'Pluie légère', emoji: '🌦️', severity: 'rain' },
    63: { label: 'Pluie modérée', emoji: '🌧️', severity: 'rain' },
    65: { label: 'Pluie forte', emoji: '🌧️', severity: 'heavy_rain' },
    66: { label: 'Pluie verglaçante légère', emoji: '🧊', severity: 'ice' },
    67: { label: 'Pluie verglaçante forte', emoji: '🧊', severity: 'ice' },
    71: { label: 'Neige légère', emoji: '🌨️', severity: 'snow' },
    73: { label: 'Neige modérée', emoji: '❄️', severity: 'snow' },
    75: { label: 'Neige forte', emoji: '❄️', severity: 'heavy_snow' },
    77: { label: 'Grains de neige', emoji: '🌨️', severity: 'snow' },
    80: { label: 'Averses légères', emoji: '🌦️', severity: 'rain' },
    81: { label: 'Averses modérées', emoji: '🌧️', severity: 'rain' },
    82: { label: 'Averses violentes', emoji: '⛈️', severity: 'heavy_rain' },
    85: { label: 'Averses de neige légères', emoji: '🌨️', severity: 'snow' },
    86: { label: 'Averses de neige fortes', emoji: '❄️', severity: 'heavy_snow' },
    95: { label: 'Orage', emoji: '⛈️', severity: 'storm' },
    96: { label: 'Orage avec grêle légère', emoji: '⛈️', severity: 'storm' },
    99: { label: 'Orage avec grêle forte', emoji: '⛈️', severity: 'storm' },
};

/**
 * Get weather description from WMO code
 * @param {number} code - WMO weather code
 * @returns {{ label: string, emoji: string, severity: string }}
 */
export function getWeatherInfo(code) {
    return WMO_CODES[code] || { label: 'Inconnu', emoji: '❓', severity: 'unknown' };
}

/**
 * Get wind direction label from degrees
 * @param {number} degrees
 * @returns {string}
 */
export function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

/**
 * Analyze weather conditions along the route and return alerts
 * @param {Array} weatherData
 * @returns {Array<{type: string, message: string}>}
 */
export function analyzeRouteWeather(weatherData) {
    if (!weatherData || weatherData.length === 0) return [];

    const alerts = [];
    const severities = weatherData.map(w => getWeatherInfo(w.weatherCode).severity);

    if (severities.includes('storm')) {
        alerts.push({ type: 'danger', message: '⛈️ Orages sur le trajet — Soyez très prudent !' });
    }
    if (severities.includes('ice')) {
        alerts.push({ type: 'danger', message: '🧊 Risque de verglas sur le trajet' });
    }
    if (severities.includes('heavy_snow') || severities.includes('snow')) {
        alerts.push({ type: 'warning', message: '❄️ Neige attendue sur le trajet' });
    }
    if (severities.includes('heavy_rain')) {
        alerts.push({ type: 'warning', message: '🌧️ Fortes pluies sur le trajet' });
    }
    if (severities.includes('fog')) {
        alerts.push({ type: 'warning', message: '🌫️ Brouillard sur le trajet — Visibilité réduite' });
    }

    const maxWind = Math.max(...weatherData.map(w => w.windSpeed));
    if (maxWind > 60) {
        alerts.push({ type: 'warning', message: `💨 Vents forts (jusqu'à ${Math.round(maxWind)} km/h)` });
    }

    if (alerts.length === 0) {
        alerts.push({ type: 'ok', message: '✅ Conditions météo favorables sur le trajet' });
    }

    return alerts;
}

/**
 * Format distance in a human-readable way
 */
export function formatDistance(meters) {
    const km = meters / 1000;
    if (km < 1) return `${Math.round(meters)} m`;
    return `${km.toFixed(1)} km`;
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${minutes.toString().padStart(2, '0')}`;
}

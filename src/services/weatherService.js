/**
 * Weather Service — Open-Meteo API
 * Free, no API key required
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch weather for multiple coordinate points
 * @param {Array<{lat: number, lng: number}>} points
 * @returns {Promise<Array>} Weather data for each point
 */
export async function fetchWeatherForPoints(points) {
    if (!points || points.length === 0) return [];

    const results = [];

    // Open-Meteo supports multi-location via comma-separated coords
    const lats = points.map(p => p.lat.toFixed(4)).join(',');
    const lngs = points.map(p => p.lng.toFixed(4)).join(',');

    const params = new URLSearchParams({
        latitude: lats,
        longitude: lngs,
        current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'weather_code',
            'wind_speed_10m',
            'wind_gusts_10m',
            'wind_direction_10m',
            'precipitation',
            'cloud_cover'
        ].join(','),
        wind_speed_unit: 'kmh',
        timezone: 'auto'
    });

    try {
        const response = await fetch(`${OPEN_METEO_URL}?${params}`);
        if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);

        const data = await response.json();

        // If single point, API returns object; if multiple, returns array
        const locations = Array.isArray(data) ? data : [data];

        for (let i = 0; i < locations.length; i++) {
            const loc = locations[i];
            const current = loc.current;

            results.push({
                lat: points[i].lat,
                lng: points[i].lng,
                temperature: current.temperature_2m,
                apparentTemperature: current.apparent_temperature,
                humidity: current.relative_humidity_2m,
                weatherCode: current.weather_code,
                windSpeed: current.wind_speed_10m,
                windGusts: current.wind_gusts_10m,
                windDirection: current.wind_direction_10m,
                precipitation: current.precipitation,
                cloudCover: current.cloud_cover,
            });
        }
    } catch (error) {
        console.error('Weather fetch error:', error);
        // Fallback: fetch each point individually
        for (const point of points) {
            try {
                const singleParams = new URLSearchParams({
                    latitude: point.lat.toFixed(4),
                    longitude: point.lng.toFixed(4),
                    current: [
                        'temperature_2m',
                        'relative_humidity_2m',
                        'apparent_temperature',
                        'weather_code',
                        'wind_speed_10m',
                        'wind_gusts_10m',
                        'wind_direction_10m',
                        'precipitation',
                        'cloud_cover'
                    ].join(','),
                    wind_speed_unit: 'kmh',
                    timezone: 'auto'
                });

                const resp = await fetch(`${OPEN_METEO_URL}?${singleParams}`);
                const loc = await resp.json();
                const current = loc.current;

                results.push({
                    lat: point.lat,
                    lng: point.lng,
                    temperature: current.temperature_2m,
                    apparentTemperature: current.apparent_temperature,
                    humidity: current.relative_humidity_2m,
                    weatherCode: current.weather_code,
                    windSpeed: current.wind_speed_10m,
                    windGusts: current.wind_gusts_10m,
                    windDirection: current.wind_direction_10m,
                    precipitation: current.precipitation,
                    cloudCover: current.cloud_cover,
                });
            } catch (e) {
                console.warn('Failed to fetch weather for point:', point, e);
            }
        }
    }

    return results;
}

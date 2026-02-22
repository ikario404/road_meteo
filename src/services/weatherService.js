/**
 * Weather Service — Open-Meteo API (Hourly Forecast)
 * Fetches time-projected weather for route points based on estimated arrival times.
 * Free, no API key required.
 */

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const HOURLY_VARS = [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'weather_code',
    'wind_speed_10m',
    'wind_gusts_10m',
    'wind_direction_10m',
    'precipitation',
    'cloud_cover'
].join(',');

/**
 * Find the closest hourly index for a given target ISO time
 * @param {string[]} timeArray - Array of ISO time strings from Open-Meteo (e.g. "2026-02-22T17:00")
 * @param {string} targetIso - Target ISO time string
 * @returns {number} Index of the closest hour
 */
function findClosestHourIndex(timeArray, targetIso) {
    const target = new Date(targetIso).getTime();
    let bestIdx = 0;
    let bestDiff = Infinity;

    for (let i = 0; i < timeArray.length; i++) {
        const diff = Math.abs(new Date(timeArray[i]).getTime() - target);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestIdx = i;
        }
    }
    return bestIdx;
}

/**
 * Extract weather data from hourly arrays at a specific index
 */
function extractHourlyData(hourly, idx) {
    return {
        temperature: hourly.temperature_2m[idx],
        apparentTemperature: hourly.apparent_temperature[idx],
        humidity: hourly.relative_humidity_2m[idx],
        weatherCode: hourly.weather_code[idx],
        windSpeed: hourly.wind_speed_10m[idx],
        windGusts: hourly.wind_gusts_10m[idx],
        windDirection: hourly.wind_direction_10m[idx],
        precipitation: hourly.precipitation[idx],
        cloudCover: hourly.cloud_cover[idx],
    };
}

/**
 * Fetch time-projected weather for route points.
 * Each point must have: lat, lng, estimatedArrivalTime (ISO string)
 *
 * @param {Array<{lat: number, lng: number, estimatedArrivalTime: string}>} points
 * @returns {Promise<Array>} Weather data projected at each point's ETA
 */
export async function fetchWeatherForPoints(points) {
    if (!points || points.length === 0) return [];

    const results = [];

    // Determine how many forecast days we need (max 16)
    const now = new Date();
    const lastEta = new Date(points[points.length - 1].estimatedArrivalTime);
    const hoursAhead = Math.max(1, Math.ceil((lastEta - now) / (3600 * 1000)));
    const forecastDays = Math.min(16, Math.max(2, Math.ceil(hoursAhead / 24) + 1));

    // Open-Meteo supports multi-location via comma-separated coords
    const lats = points.map(p => p.lat.toFixed(4)).join(',');
    const lngs = points.map(p => p.lng.toFixed(4)).join(',');

    const params = new URLSearchParams({
        latitude: lats,
        longitude: lngs,
        hourly: HOURLY_VARS,
        wind_speed_unit: 'kmh',
        timezone: 'auto',
        forecast_days: forecastDays.toString(),
    });

    try {
        const response = await fetch(`${OPEN_METEO_URL}?${params}`);
        if (!response.ok) throw new Error(`Open-Meteo API error: ${response.status}`);

        const data = await response.json();

        // If single point, API returns object; if multiple, returns array
        const locations = Array.isArray(data) ? data : [data];

        for (let i = 0; i < locations.length; i++) {
            const loc = locations[i];
            const hourly = loc.hourly;
            const targetTime = points[i].estimatedArrivalTime;

            // Find closest hourly slot to the estimated arrival
            const idx = findClosestHourIndex(hourly.time, targetTime);
            const weatherAtEta = extractHourlyData(hourly, idx);

            results.push({
                lat: points[i].lat,
                lng: points[i].lng,
                forecastTime: hourly.time[idx],
                ...weatherAtEta,
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
                    hourly: HOURLY_VARS,
                    wind_speed_unit: 'kmh',
                    timezone: 'auto',
                    forecast_days: forecastDays.toString(),
                });

                const resp = await fetch(`${OPEN_METEO_URL}?${singleParams}`);
                const loc = await resp.json();
                const hourly = loc.hourly;
                const idx = findClosestHourIndex(hourly.time, point.estimatedArrivalTime);
                const weatherAtEta = extractHourlyData(hourly, idx);

                results.push({
                    lat: point.lat,
                    lng: point.lng,
                    forecastTime: hourly.time[idx],
                    ...weatherAtEta,
                });
            } catch (e) {
                console.warn('Failed to fetch weather for point:', point, e);
            }
        }
    }

    return results;
}

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sampleRoutePoints, getWeatherInfo, getWindDirection, formatTime } from '../utils/routeUtils';
import { fetchWeatherForPoints } from '../services/weatherService';
import { reverseGeocode } from '../services/geocodingService';

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export default function MapView({
    origin,
    destination,
    onRouteCalculated,
    onWeatherLoaded,
    loading,
    highlightedPoint,
    departureTime,
}) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const routeLayerRef = useRef(null);
    const markersLayerRef = useRef(null);
    const originMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const weatherMarkersRef = useRef([]);
    const [routeCoords, setRouteCoords] = useState(null);

    // Initialize map
    useEffect(() => {
        if (mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: [46.603354, 1.888334], // Center of France
            zoom: 6,
            zoomControl: false,
        });

        // CartoDB Dark Matter tiles (free, no API key)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
        }).addTo(map);

        // Add zoom control to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;
        routeLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Update origin marker
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (originMarkerRef.current) {
            map.removeLayer(originMarkerRef.current);
            originMarkerRef.current = null;
        }

        if (origin) {
            const icon = L.divIcon({
                html: '<div style="background:#34d399;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                className: '',
            });
            originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon }).addTo(map);
            originMarkerRef.current.bindPopup(`<b>Départ</b><br/>${origin.name || ''}`);
        }
    }, [origin]);

    // Update destination marker
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (destMarkerRef.current) {
            map.removeLayer(destMarkerRef.current);
            destMarkerRef.current = null;
        }

        if (destination) {
            const icon = L.divIcon({
                html: '<div style="background:#f87171;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                className: '',
            });
            destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon }).addTo(map);
            destMarkerRef.current.bindPopup(`<b>Arrivée</b><br/>${destination.name || ''}`);
        }
    }, [destination]);

    // Calculate route when loading starts
    useEffect(() => {
        if (!loading || !origin || !destination) return;

        const map = mapInstanceRef.current;
        if (!map) return;

        // Clear previous route & weather markers
        routeLayerRef.current.clearLayers();
        markersLayerRef.current.clearLayers();
        weatherMarkersRef.current = [];
        setRouteCoords(null);

        const fetchRoute = async () => {
            try {
                // Call OSRM
                const url = `${OSRM_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
                const resp = await fetch(url);
                const data = await resp.json();

                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    console.error('OSRM error:', data);
                    onWeatherLoaded([]);
                    return;
                }

                const route = data.routes[0];
                const coords = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));

                // Draw route polyline
                const polyline = L.polyline(
                    coords.map(c => [c.lat, c.lng]),
                    {
                        color: '#4a9eff',
                        weight: 4,
                        opacity: 0.8,
                        smoothFactor: 1,
                    }
                );
                routeLayerRef.current.addLayer(polyline);

                // Add a glow effect
                const glowLine = L.polyline(
                    coords.map(c => [c.lat, c.lng]),
                    {
                        color: '#4a9eff',
                        weight: 10,
                        opacity: 0.15,
                        smoothFactor: 1,
                    }
                );
                routeLayerRef.current.addLayer(glowLine);

                // Fit bounds (responsive padding for mobile vs desktop panel)
                const isMobile = window.innerWidth < 768;
                map.fitBounds(polyline.getBounds(), {
                    padding: isMobile ? [50, 50] : [60, 340],
                    maxZoom: 14,
                });

                // Report route info
                onRouteCalculated({
                    distance: route.distance,
                    duration: route.duration,
                    coordinates: coords,
                });

                setRouteCoords(coords);

                // Sample points and fetch weather
                const totalDistKm = route.distance / 1000;
                // Adaptive interval: fewer points for short routes, more for long
                let interval = 30;
                if (totalDistKm < 50) interval = 10;
                else if (totalDistKm < 150) interval = 20;
                else if (totalDistKm > 500) interval = 50;

                const samplePoints = sampleRoutePoints(coords, interval, route.duration, departureTime ? new Date(departureTime) : null);

                // Fetch weather for all points
                const weatherResults = await fetchWeatherForPoints(samplePoints);

                // Merge distance + ETA info
                const enrichedWeather = weatherResults.map((w, i) => ({
                    ...w,
                    distanceKm: samplePoints[i]?.distanceKm || 0,
                    estimatedArrivalTime: samplePoints[i]?.estimatedArrivalTime || null,
                    etaOffsetSeconds: samplePoints[i]?.etaOffsetSeconds || 0,
                }));

                // Reverse geocode point names (sequential with delay to respect Nominatim rate limits)
                for (let i = 0; i < enrichedWeather.length; i++) {
                    try {
                        enrichedWeather[i].locationName = await reverseGeocode(
                            enrichedWeather[i].lat, enrichedWeather[i].lng
                        );
                    } catch {
                        enrichedWeather[i].locationName = `Point ${i + 1}`;
                    }
                    // Nominatim requires max 1 req/s; add 300ms delay
                    if (i < enrichedWeather.length - 1) {
                        await new Promise(r => setTimeout(r, 300));
                    }
                }

                // Add weather markers to map
                enrichedWeather.forEach((w, i) => {
                    const weather = getWeatherInfo(w.weatherCode);
                    const icon = L.divIcon({
                        html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));cursor:pointer;">${weather.emoji}</div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15],
                        className: '',
                    });

                    const marker = L.marker([w.lat, w.lng], { icon }).addTo(markersLayerRef.current);
                    const etaLabel = w.estimatedArrivalTime ? formatTime(w.estimatedArrivalTime) : '';
                    marker.bindPopup(`
            <div class="popup-weather">
              <div class="popup-weather__icon">${weather.emoji}</div>
              <div class="popup-weather__temp">${w.temperature}°C</div>
              <div class="popup-weather__desc">${weather.label}</div>
              <div class="popup-weather__details">
                <span>💨 ${w.windSpeed} km/h ${getWindDirection(w.windDirection)}</span>
                <span>💧 ${w.humidity}%</span>
              </div>
              <div class="popup-weather__details" style="margin-top:4px;">
                <span>🌡️ Ressenti ${w.apparentTemperature}°C</span>
                <span>🌧️ ${w.precipitation} mm</span>
              </div>
              <div style="margin-top:6px;font-size:0.7rem;color:#a0a0b8;">
                📍 ${w.locationName} — km ${w.distanceKm}
              </div>
              ${etaLabel ? `<div style="margin-top:4px;font-size:0.75rem;color:#8bb4f0;">🕐 Arrivée estimée : ${etaLabel}</div>` : ''}
            </div>
          `);

                    weatherMarkersRef.current.push(marker);
                });

                onWeatherLoaded(enrichedWeather);
            } catch (error) {
                console.error('Route calculation error:', error);
                onWeatherLoaded([]);
            }
        };

        fetchRoute();
    }, [loading, origin, destination]);

    // Handle highlighted point from weather panel
    useEffect(() => {
        if (highlightedPoint !== null && weatherMarkersRef.current[highlightedPoint]) {
            weatherMarkersRef.current[highlightedPoint].openPopup();
        }
    }, [highlightedPoint]);

    return <div ref={mapRef} className="map-container" />;
}

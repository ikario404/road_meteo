import { useRef, useCallback } from 'react';
import { getWeatherInfo, analyzeRouteWeather, getWindDirection, formatTime } from '../utils/routeUtils';

export default function WeatherPanel({ weatherData, onPointHover, panelState, onStateChange }) {
    if (!weatherData || weatherData.length === 0) return null;
    if (panelState === 'hidden') return null;

    const alerts = analyzeRouteWeather(weatherData);
    const startYRef = useRef(null);
    const currentYRef = useRef(null);
    const panelRef = useRef(null);

    // Summary stats
    const temps = weatherData.map(w => w.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgWind = Math.round(weatherData.reduce((s, w) => s + w.windSpeed, 0) / weatherData.length);
    const maxPrecip = Math.max(...weatherData.map(w => w.precipitation));

    const isCollapsed = panelState === 'collapsed';

    // Touch drag handling for bottom-sheet
    const handleTouchStart = useCallback((e) => {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = e.touches[0].clientY;
    }, []);

    const handleTouchMove = useCallback((e) => {
        currentYRef.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (startYRef.current === null) return;
        const deltaY = currentYRef.current - startYRef.current;
        const threshold = 50;

        if (deltaY > threshold) {
            // Swiped down
            if (panelState === 'expanded') {
                onStateChange('collapsed');
            } else {
                onStateChange('hidden');
            }
        } else if (deltaY < -threshold) {
            // Swiped up
            if (panelState === 'collapsed') {
                onStateChange('expanded');
            }
        }
        startYRef.current = null;
    }, [panelState, onStateChange]);

    const handleClose = (e) => {
        e.stopPropagation();
        onStateChange('hidden');
    };

    const handleToggle = () => {
        onStateChange(isCollapsed ? 'expanded' : 'collapsed');
    };

    return (
        <div
            ref={panelRef}
            className={`weather-panel glass-panel weather-panel--${panelState}`}
        >
            {/* Drag handle (mobile) */}
            <div
                className="weather-panel__handle"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleToggle}
            >
                <div className="weather-panel__handle-bar"></div>
            </div>

            {/* Header row with close button */}
            <div className="weather-panel__header-row">
                <div className="weather-panel__title">
                    🌤️ Météo projetée sur le trajet
                    {!isCollapsed && (
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px', fontWeight: 400 }}>
                            Prévisions ajustées selon votre heure d'arrivée estimée
                        </div>
                    )}
                </div>
                <button className="weather-panel__close" onClick={handleClose} aria-label="Fermer">✕</button>
            </div>

            {/* Collapsed: show only summary line */}
            {isCollapsed && (
                <div className="weather-panel__mini-summary" onClick={() => onStateChange('expanded')}>
                    <span>🌡️ {minTemp}° / {maxTemp}°</span>
                    <span>💨 {avgWind} km/h</span>
                    <span>🌧️ {maxPrecip} mm</span>
                </div>
            )}

            {/* Expanded content */}
            {!isCollapsed && (
                <div className="weather-panel__content">
                    {/* Alerts */}
                    {alerts.map((alert, i) => (
                        <div key={i} className={`weather-alert weather-alert--${alert.type}`}>
                            {alert.message}
                        </div>
                    ))}

                    {/* Summary Grid */}
                    <div className="weather-summary">
                        <div className="weather-summary__card">
                            <div className="weather-summary__icon">🌡️</div>
                            <div className="weather-summary__value">{minTemp}° / {maxTemp}°</div>
                            <div className="weather-summary__label">Min / Max</div>
                        </div>
                        <div className="weather-summary__card">
                            <div className="weather-summary__icon">💨</div>
                            <div className="weather-summary__value">{avgWind} km/h</div>
                            <div className="weather-summary__label">Vent moyen</div>
                        </div>
                        <div className="weather-summary__card">
                            <div className="weather-summary__icon">🌧️</div>
                            <div className="weather-summary__value">{maxPrecip} mm</div>
                            <div className="weather-summary__label">Précip. max</div>
                        </div>
                        <div className="weather-summary__card">
                            <div className="weather-summary__icon">📍</div>
                            <div className="weather-summary__value">{weatherData.length}</div>
                            <div className="weather-summary__label">Points analysés</div>
                        </div>
                    </div>

                    {/* Point-by-point list */}
                    <div className="weather-points__title">Détail par point</div>
                    {weatherData.map((point, i) => {
                        const weather = getWeatherInfo(point.weatherCode);
                        return (
                            <div
                                key={i}
                                className="weather-point"
                                onMouseEnter={() => onPointHover && onPointHover(i)}
                                onMouseLeave={() => onPointHover && onPointHover(null)}
                            >
                                <div className="weather-point__icon">{weather.emoji}</div>
                                <div className="weather-point__info">
                                    <div className="weather-point__temp">{point.temperature}°C</div>
                                    <div className="weather-point__location">{weather.label}</div>
                                    <div className="weather-point__details">
                                        <span>💨 {point.windSpeed} km/h {getWindDirection(point.windDirection)}</span>
                                        <span>💧 {point.humidity}%</span>
                                    </div>
                                </div>
                                <div className="weather-point__km">
                                    <div>km {point.distanceKm || 0}</div>
                                    {point.estimatedArrivalTime && (
                                        <div style={{ fontSize: '0.7rem', color: '#8bb4f0', marginTop: '2px' }}>
                                            🕐 ~{formatTime(point.estimatedArrivalTime)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import { getWeatherInfo, analyzeRouteWeather, getWindDirection } from '../utils/routeUtils';

export default function WeatherPanel({ weatherData, onPointHover }) {
    if (!weatherData || weatherData.length === 0) return null;

    const alerts = analyzeRouteWeather(weatherData);

    // Summary stats
    const temps = weatherData.map(w => w.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgWind = Math.round(weatherData.reduce((s, w) => s + w.windSpeed, 0) / weatherData.length);
    const maxPrecip = Math.max(...weatherData.map(w => w.precipitation));

    return (
        <div className="weather-panel glass-panel">
            <div className="weather-panel__title">
                🌤️ Météo sur le trajet
            </div>

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
                            km {point.distanceKm || 0}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

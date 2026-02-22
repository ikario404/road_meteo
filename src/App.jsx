import { useState, useCallback, useEffect } from 'react';
import MapView from './components/MapView';
import SearchPanel from './components/SearchPanel';
import WeatherPanel from './components/WeatherPanel';

export default function App() {
    const [origin, setOrigin] = useState(null);
    const [destination, setDestination] = useState(null);
    const [routeData, setRouteData] = useState(null); // { distance, duration, coordinates }
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [highlightedPoint, setHighlightedPoint] = useState(null);
    const [departureTime, setDepartureTime] = useState(null); // null = now

    // Mobile panel states
    const [searchCollapsed, setSearchCollapsed] = useState(false);
    const [weatherPanelState, setWeatherPanelState] = useState('expanded'); // 'expanded' | 'collapsed' | 'hidden'

    const handleRouteCalculated = useCallback((data) => {
        setRouteData(data);
    }, []);

    const handleWeatherLoaded = useCallback((data) => {
        setWeatherData(data);
        setLoading(false);
        // Auto-collapse search panel and expand weather panel on mobile when data arrives
        if (data && data.length > 0) {
            setSearchCollapsed(true);
            setWeatherPanelState('collapsed');
        }
    }, []);

    const handleCalculate = useCallback(() => {
        if (origin && destination) {
            setLoading(true);
            setWeatherData(null);
        }
    }, [origin, destination]);

    const handleReset = useCallback(() => {
        setOrigin(null);
        setDestination(null);
        setRouteData(null);
        setWeatherData(null);
        setHighlightedPoint(null);
        setDepartureTime(null);
        setSearchCollapsed(false);
        setWeatherPanelState('expanded');
    }, []);

    const toggleSearchCollapsed = useCallback(() => {
        setSearchCollapsed(prev => !prev);
    }, []);

    const showWeatherFab = weatherData && weatherData.length > 0 && weatherPanelState === 'hidden';

    return (
        <div className="app">
            <MapView
                origin={origin}
                destination={destination}
                onRouteCalculated={handleRouteCalculated}
                onWeatherLoaded={handleWeatherLoaded}
                loading={loading}
                highlightedPoint={highlightedPoint}
                departureTime={departureTime}
            />
            <SearchPanel
                origin={origin}
                destination={destination}
                onOriginChange={setOrigin}
                onDestinationChange={setDestination}
                onCalculate={handleCalculate}
                onReset={handleReset}
                routeData={routeData}
                loading={loading}
                collapsed={searchCollapsed}
                onToggleCollapse={toggleSearchCollapsed}
                departureTime={departureTime}
                onDepartureTimeChange={setDepartureTime}
            />
            {weatherData && weatherData.length > 0 && (
                <WeatherPanel
                    weatherData={weatherData}
                    onPointHover={setHighlightedPoint}
                    panelState={weatherPanelState}
                    onStateChange={setWeatherPanelState}
                />
            )}
            {/* Floating button to reopen weather panel */}
            {showWeatherFab && (
                <button
                    className="weather-fab"
                    onClick={() => setWeatherPanelState('collapsed')}
                    aria-label="Réouvrir la météo"
                >
                    🌤️
                </button>
            )}
        </div>
    );
}

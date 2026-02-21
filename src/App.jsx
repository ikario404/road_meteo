import { useState, useCallback } from 'react';
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

    const handleRouteCalculated = useCallback((data) => {
        setRouteData(data);
    }, []);

    const handleWeatherLoaded = useCallback((data) => {
        setWeatherData(data);
        setLoading(false);
    }, []);

    const handleCalculate = useCallback(() => {
        if (origin && destination) {
            setLoading(true);
            setWeatherData(null);
            // RouteData will be set by MapView callback
        }
    }, [origin, destination]);

    const handleReset = useCallback(() => {
        setOrigin(null);
        setDestination(null);
        setRouteData(null);
        setWeatherData(null);
        setHighlightedPoint(null);
    }, []);

    return (
        <div className="app">
            <MapView
                origin={origin}
                destination={destination}
                onRouteCalculated={handleRouteCalculated}
                onWeatherLoaded={handleWeatherLoaded}
                loading={loading}
                highlightedPoint={highlightedPoint}
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
            />
            {weatherData && weatherData.length > 0 && (
                <WeatherPanel
                    weatherData={weatherData}
                    onPointHover={setHighlightedPoint}
                />
            )}
        </div>
    );
}

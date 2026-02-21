import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAddress } from '../services/geocodingService';
import { formatDistance, formatDuration } from '../utils/routeUtils';

let debounceTimer = null;

export default function SearchPanel({
    origin,
    destination,
    onOriginChange,
    onDestinationChange,
    onCalculate,
    onReset,
    routeData,
    loading,
}) {
    const [originText, setOriginText] = useState('');
    const [destText, setDestText] = useState('');
    const [originSuggestions, setOriginSuggestions] = useState([]);
    const [destSuggestions, setDestSuggestions] = useState([]);
    const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);
    const originRef = useRef(null);
    const destRef = useRef(null);

    const debouncedSearch = useCallback((query, setter, showSetter) => {
        clearTimeout(debounceTimer);
        if (query.length < 3) {
            setter([]);
            showSetter(false);
            return;
        }
        debounceTimer = setTimeout(async () => {
            const results = await searchAddress(query);
            setter(results);
            showSetter(results.length > 0);
        }, 400);
    }, []);

    const handleOriginInput = (e) => {
        const val = e.target.value;
        setOriginText(val);
        onOriginChange(null);
        debouncedSearch(val, setOriginSuggestions, setShowOriginSuggestions);
    };

    const handleDestInput = (e) => {
        const val = e.target.value;
        setDestText(val);
        onDestinationChange(null);
        debouncedSearch(val, setDestSuggestions, setShowDestSuggestions);
    };

    const selectOrigin = (suggestion) => {
        setOriginText(suggestion.shortName || suggestion.displayName);
        onOriginChange({ lat: suggestion.lat, lng: suggestion.lng, name: suggestion.shortName });
        setShowOriginSuggestions(false);
        setOriginSuggestions([]);
    };

    const selectDest = (suggestion) => {
        setDestText(suggestion.shortName || suggestion.displayName);
        onDestinationChange({ lat: suggestion.lat, lng: suggestion.lng, name: suggestion.shortName });
        setShowDestSuggestions(false);
        setDestSuggestions([]);
    };

    // Close suggestions on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (originRef.current && !originRef.current.contains(e.target)) {
                setShowOriginSuggestions(false);
            }
            if (destRef.current && !destRef.current.contains(e.target)) {
                setShowDestSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const canCalculate = origin && destination && !loading;

    const handleResetClick = () => {
        setOriginText('');
        setDestText('');
        setOriginSuggestions([]);
        setDestSuggestions([]);
        onReset();
    };

    return (
        <div className="search-panel glass-panel">
            {/* Header */}
            <div className="search-panel__header">
                <div className="search-panel__logo">🛣️</div>
                <div>
                    <div className="search-panel__title">Road Meteo</div>
                    <div className="search-panel__subtitle">Météo sur votre itinéraire</div>
                </div>
            </div>

            {/* Origin Input */}
            <div className="input-group" ref={originRef}>
                <label className="input-group__label">
                    <span className="input-group__dot input-group__dot--start"></span>
                    Départ
                </label>
                <input
                    id="input-origin"
                    type="text"
                    className="input-group__input"
                    placeholder="Entrez une adresse de départ..."
                    value={originText}
                    onChange={handleOriginInput}
                    onFocus={() => originSuggestions.length > 0 && setShowOriginSuggestions(true)}
                    autoComplete="off"
                />
                {showOriginSuggestions && (
                    <div className="suggestions">
                        {originSuggestions.map((s, i) => (
                            <div
                                key={i}
                                className="suggestions__item"
                                onClick={() => selectOrigin(s)}
                            >
                                {s.displayName}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Destination Input */}
            <div className="input-group" ref={destRef}>
                <label className="input-group__label">
                    <span className="input-group__dot input-group__dot--end"></span>
                    Arrivée
                </label>
                <input
                    id="input-destination"
                    type="text"
                    className="input-group__input"
                    placeholder="Entrez une adresse d'arrivée..."
                    value={destText}
                    onChange={handleDestInput}
                    onFocus={() => destSuggestions.length > 0 && setShowDestSuggestions(true)}
                    autoComplete="off"
                />
                {showDestSuggestions && (
                    <div className="suggestions">
                        {destSuggestions.map((s, i) => (
                            <div
                                key={i}
                                className="suggestions__item"
                                onClick={() => selectDest(s)}
                            >
                                {s.displayName}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Calculate Button */}
            <button
                id="btn-calculate"
                className={`btn-calculate ${loading ? 'btn-calculate--loading' : ''}`}
                onClick={onCalculate}
                disabled={!canCalculate}
            >
                {loading ? 'Calcul en cours...' : '🔍 Calculer l\'itinéraire'}
            </button>

            {/* Route Info */}
            {routeData && (
                <>
                    <div className="route-info">
                        <div className="route-info__item">
                            <div className="route-info__value">{formatDistance(routeData.distance)}</div>
                            <div className="route-info__label">Distance</div>
                        </div>
                        <div className="route-info__item">
                            <div className="route-info__value">{formatDuration(routeData.duration)}</div>
                            <div className="route-info__label">Durée estimée</div>
                        </div>
                    </div>
                    <button
                        className="btn-calculate"
                        style={{
                            marginTop: '12px',
                            background: 'rgba(255,255,255,0.06)',
                            boxShadow: 'none',
                            fontSize: '0.85rem',
                        }}
                        onClick={handleResetClick}
                    >
                        ↺ Nouvel itinéraire
                    </button>
                </>
            )}
        </div>
    );
}

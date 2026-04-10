import React, { useState } from 'react';

export const SUPPORTED_TEXAS_CITIES = [
    'Denton',
    'Lewisville',
    'Corinth',
    'Lake Dallas',
    'Plano',
    'Frisco',
    'Grapevine',
    'Southlake',
    'Trophy Club',
    'Justin',
    'Northlake',
    'Argyle',
    'Lantana',
    'The Colony',
];

const SUPPORTED_TEXAS_CITIES_SET = new Set(
    SUPPORTED_TEXAS_CITIES.flatMap((city) => {
        const normalized = city.toLowerCase();
        if (normalized === 'northlake') return [normalized, 'north lake'];
        return [normalized];
    })
);

function normalizeLocationValue(value) {
    return (value || '').toLowerCase().trim();
}

function isCitySupported(city, state) {
    const normalizedState = normalizeLocationValue(state);
    const normalizedCity = normalizeLocationValue(city);
    const isTexas = normalizedState === 'tx' || normalizedState === 'texas';
    return isTexas && SUPPORTED_TEXAS_CITIES_SET.has(normalizedCity);
}

export default function AddressSearch({ value, onChange, onServiceError }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    React.useEffect(() => {
        setQuery(value || '');
    }, [value]);

    React.useEffect(() => {
        if (query === value) return;
        const timer = setTimeout(() => {
            if (query.length > 2) {
                setIsSearching(true);
                fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `format=json&q=${encodeURIComponent(query)}&countrycodes=us` +
                    `&addressdetails=1&limit=6&viewbox=-97.5,-96.5,33.4,32.5&bounded=0`
                )
                    .then(res => res.json())
                    .then(data => {
                        const formatted = data
                            .filter(r => r.address && (r.type === 'house' || r.type === 'residential' || r.class === 'place' || r.class === 'building' || r.class === 'highway' || r.address.road))
                            .map(r => ({
                                display: r.display_name,
                                city: r.address.city || r.address.town || r.address.village || r.address.hamlet || r.address.county || '',
                                state: r.address.state || '',
                            }));
                        setResults(formatted.length > 0 ? formatted : data.slice(0, 5).map(r => ({
                            display: r.display_name,
                            city: r.address?.city || r.address?.town || r.address?.village || r.address?.hamlet || r.address?.county || '',
                            state: r.address?.state || '',
                        })));
                        setIsSearching(false);
                    })
                    .catch(() => {
                        setResults([]);
                        setIsSearching(false);
                    });
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, value]);

    const handleSelect = (result) => {
        const shortDisplay = result.display.split(',').slice(0, 4).join(',');
        setQuery(shortDisplay);

        if (!isCitySupported(result.city, result.state)) {
            onChange('');
            if (onServiceError) onServiceError(result.city || 'this city');
        } else {
            onChange(shortDisplay);
            if (onServiceError) onServiceError(null);
        }
        setResults([]);
    };

    return (
        <div className="address-search-container">
            <input
                type="text"
                className="guru-input"
                placeholder="Start typing your address..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value === '') {
                        onChange('');
                        if (onServiceError) onServiceError(null);
                    }
                }}
            />
            {isSearching && <div className="address-searching">Searching addresses...</div>}
            {results.length > 0 && (
                <div className="address-results">
                    {results.map((r, i) => (
                        <button key={i} className="address-result-item" type="button" onClick={() => handleSelect(r)}>
                            📍 {r.display.split(',').slice(0, 3).join(',')}
                        </button>
                    ))}
                    <div className="address-api-note">Powered by OpenStreetMap</div>
                </div>
            )}
        </div>
    );
}

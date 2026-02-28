import React, { useState } from 'react';
import { TIME_SLOTS } from '@shared/constants';
import GuruCalendar from '@shared/GuruCalendar';
import '@shared/guru-calendar.css';

const SUPPORTED_TEXAS_CITIES = new Set([
    'denton',
    'lewisville',
    'corinth',
    'lake dallas',
    'plano',
    'frisco',
    'grapevine',
    'southlake',
    'trophy club',
    'justin',
    'northlake',
    'north lake',
    'argyle',
    'lantana',
    'the colony',
]);

function normalizeLocationValue(value) {
    return (value || '').toLowerCase().trim();
}

function isCitySupported(city, state) {
    const normalizedState = normalizeLocationValue(state);
    const normalizedCity = normalizeLocationValue(city);
    const isTexas = normalizedState === 'tx' || normalizedState === 'texas';
    return isTexas && SUPPORTED_TEXAS_CITIES.has(normalizedCity);
}

const AddressSearch = ({ value, onChange, onServiceError }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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
                        <button key={i} className="address-result-item" onClick={() => handleSelect(r)}>
                            📍 {r.display.split(',').slice(0, 3).join(',')}
                        </button>
                    ))}
                    <div className="address-api-note">Powered by OpenStreetMap</div>
                </div>
            )}
        </div>
    );
};

export default function ScheduleStep({
    scheduleDate,
    scheduleTime,
    scheduleAddress,
    serviceAreaError,
    allPartsInStock,
    needsPartsOrder,
    minDateStr,
    availableDates,
    availableSlotsByDate,
    onDateChange,
    onTimeChange,
    onAddressChange,
    onServiceAreaError,
    onBack,
    onNext,
}) {
    return (
        <div className="quiz__panel animate-fade-in-up">
            <h2 className="quiz__title">When & where?</h2>

            {/* Inventory status banner */}
            {allPartsInStock === true ? (
                <div className="quiz__inventory-banner quiz__inventory-banner--in-stock">
                    <span className="quiz__inventory-banner-icon">✓</span>
                    <div>
                        <strong>All parts are in stock!</strong>
                        <p>We have everything needed for your repair. Schedule at the earliest available time.</p>
                    </div>
                </div>
            ) : needsPartsOrder ? (
                <div className="quiz__inventory-banner quiz__inventory-banner--order">
                    <span className="quiz__inventory-banner-icon">📦</span>
                    <div>
                        <strong>Some parts need to be ordered</strong>
                        <p>We need to order parts for your repair. Please schedule at least 3 days out so we can have everything ready.</p>
                    </div>
                </div>
            ) : (
                <p className="quiz__subtitle">
                    Pick a date and time for your repair.
                </p>
            )}

            <div className="sched-section">
                <label className="sched-label">Pick a Date</label>
                <p className="sched-hint sched-hint--above">Available dates and times match our technicians’ schedules.</p>
                <GuruCalendar
                    value={scheduleDate}
                    onChange={onDateChange}
                    minDate={minDateStr}
                    availableDates={availableDates}
                />
            </div>

            <div className="sched-section">
                <label className="sched-label">Time Slot</label>
                <div className="sched-slots">
                    {TIME_SLOTS.map((slot) => {
                        const hasAvailabilityData = availableDates !== null;
                        const dateSlots = availableSlotsByDate[scheduleDate];
                        const slotDisabled = hasAvailabilityData && scheduleDate
                            && (!dateSlots || !dateSlots.includes(slot.id));
                        return (
                            <button
                                key={slot.id}
                                className={`sched-slot ${scheduleTime === slot.id ? 'sched-slot--selected' : ''} ${slotDisabled ? 'sched-slot--disabled' : ''}`}
                                onClick={() => !slotDisabled && onTimeChange(slot.id)}
                                disabled={slotDisabled}
                            >
                                <span className="sched-slot__icon">{slot.icon}</span>
                                <span className="sched-slot__label">{slot.label}</span>
                                <span className="sched-slot__range">{slot.range}</span>
                            </button>
                        );
                    })}
                </div>
                {!scheduleDate && (
                    <p className="sched-hint">Select a date above to see available time slots.</p>
                )}
                {scheduleDate && availableDates && !availableSlotsByDate[scheduleDate] && (
                    <p className="sched-hint sched-hint--warn">
                        No time slots available on this date. Please select a different date.
                    </p>
                )}
            </div>

            <div className="sched-section">
                <label className="sched-label">Your Location</label>
                <AddressSearch
                    value={scheduleAddress}
                    onChange={onAddressChange}
                    onServiceError={onServiceAreaError}
                />
                {serviceAreaError ? (
                    <div className="sched-service-error">
                        <span className="sched-service-error__icon">⚠️</span>
                        <div>
                            <strong>Not available in {serviceAreaError}</strong>
                            <p>We currently serve select cities in Texas. We are coming to other cities soon.</p>
                        </div>
                    </div>
                ) : (
                    <p className="sched-hint">We come to your home, office, or wherever you are. Currently serving select cities in Texas.</p>
                )}
            </div>

            <div className="quiz__actions">
                <button className="guru-btn guru-btn--ghost" onClick={onBack}>← Back</button>
                <button
                    className="guru-btn guru-btn--primary guru-btn--lg"
                    disabled={!scheduleDate || !scheduleTime || !scheduleAddress}
                    onClick={onNext}
                >
                    Review & Book →
                </button>
            </div>
        </div>
    );
}

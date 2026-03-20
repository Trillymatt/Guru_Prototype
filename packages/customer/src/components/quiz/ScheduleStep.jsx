import React, { useEffect, useRef } from 'react';
import GuruCalendar from '@shared/GuruCalendar';
import '@shared/guru-calendar.css';
import AddressSearch, { SUPPORTED_TEXAS_CITIES } from '../AddressSearch';

export default function ScheduleStep({
    scheduleDate,
    scheduleAddress,
    serviceAreaError,
    minDateStr,
    maxDateStr,
    previewStartStr,
    availableDates,
    onDateChange,
    onAddressChange,
    onServiceAreaError,
    onBack,
    onNext,
    savedAddresses = [],
    suppressAutoAdvance = false,
    canGoPrevWindow = false,
    canGoNextWindow = false,
    onPrevWindow,
    onNextWindow,
    dateSectionRef,
}) {
    const autoAdvanceRef = useRef(null);
    const todayLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    // Auto-advance when all required fields are filled
    useEffect(() => {
        clearTimeout(autoAdvanceRef.current);
        if (suppressAutoAdvance) return undefined;

        const hasDate = Boolean(scheduleDate);
        const hasAddress = Boolean(scheduleAddress);

        if (hasDate && hasAddress && !serviceAreaError) {
            autoAdvanceRef.current = setTimeout(() => onNext(), 600);
        }

        return () => clearTimeout(autoAdvanceRef.current);
    }, [scheduleDate, scheduleAddress, serviceAreaError, suppressAutoAdvance]);

    return (
        <div className="quiz__panel animate-fade-in-up">
            <h2 className="quiz__title">When & where?</h2>
            <p className="quiz__subtitle">Pick your preferred date. We will confirm the exact time when your parts arrive.</p>

            {/* Address / Location — shown first so pre-filled address is visible */}
            <div className="sched-section">
                <label className="sched-label">Your Location</label>
                <p className="sched-hint sched-hint--above">
                    Enter your home, office, or work address.
                </p>
                {savedAddresses.length > 0 && (
                    <div className="quiz__saved-addresses">
                        {savedAddresses.map((addr) => (
                            <button
                                key={addr.id}
                                className={`quiz__saved-address-btn ${scheduleAddress === addr.address ? 'quiz__saved-address-btn--selected' : ''}`}
                                onClick={() => {
                                    onAddressChange(addr.address);
                                    if (onServiceAreaError) onServiceAreaError(null);
                                }}
                            >
                                <span className="quiz__saved-address-label">{addr.label}</span>
                                <span className="quiz__saved-address-text">{addr.address}</span>
                                {addr.is_default && <span className="quiz__saved-address-default">Default</span>}
                            </button>
                        ))}
                        <div className="quiz__saved-devices-divider" style={{ margin: '12px 0' }}>
                            <span>or enter a new address</span>
                        </div>
                    </div>
                )}
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
                    <p className="sched-hint">We currently serve select Texas cities and are expanding soon.</p>
                )}
                <p className="sched-service-cities">
                    Serving now: {SUPPORTED_TEXAS_CITIES.join(', ')}
                </p>
            </div>

            <div className="sched-section" ref={dateSectionRef}>
                <label className="sched-label">Pick a Date</label>
                <p className="sched-hint sched-hint--above">Select from available dates in the current 2-week window.</p>
                <div className="sched-window-nav">
                    <button type="button" className="guru-btn guru-btn--ghost guru-btn--sm" onClick={onPrevWindow} disabled={!canGoPrevWindow}>
                        ← Earlier
                    </button>
                    <button type="button" className="guru-btn guru-btn--ghost guru-btn--sm" onClick={onNextWindow} disabled={!canGoNextWindow}>
                        Later →
                    </button>
                </div>
                <GuruCalendar
                    value={scheduleDate}
                    onChange={onDateChange}
                    minDate={minDateStr}
                    maxDate={maxDateStr}
                    previewStartDate={previewStartStr}
                    availableDates={availableDates}
                    showOnlyRange={true}
                />
                <p className="sched-hint">Today is {todayLabel}</p>
            </div>
            {scheduleDate && availableDates && !availableDates.has(scheduleDate) && (
                <p className="sched-hint sched-hint--warn">
                    No availability on this date. Please choose another date.
                </p>
            )}

            <div className="quiz__actions">
                <button className="guru-btn guru-btn--ghost" onClick={onBack}>← Back</button>
                <button
                    className="guru-btn guru-btn--primary guru-btn--lg"
                    disabled={!scheduleDate || !scheduleAddress}
                    onClick={onNext}
                >
                    Review & Book →
                </button>
            </div>
        </div>
    );
}

import React, { useEffect, useRef } from 'react';
import { TIME_SLOTS } from '@shared/constants';
import GuruCalendar from '@shared/GuruCalendar';
import '@shared/guru-calendar.css';
import AddressSearch from '../AddressSearch';

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
    savedAddresses = [],
}) {
    const autoAdvanceRef = useRef(null);

    // Auto-advance when all required fields are filled
    useEffect(() => {
        clearTimeout(autoAdvanceRef.current);

        const hasDate = Boolean(scheduleDate);
        const hasAddress = Boolean(scheduleAddress);
        const hasTime = Boolean(scheduleTime);

        // If parts need ordering, time isn't required — advance when date + address are set
        if (needsPartsOrder && hasDate && hasAddress && !serviceAreaError) {
            autoAdvanceRef.current = setTimeout(() => onNext(), 600);
        }
        // If parts in stock, need all three
        else if (hasDate && hasTime && hasAddress && !serviceAreaError) {
            autoAdvanceRef.current = setTimeout(() => onNext(), 600);
        }

        return () => clearTimeout(autoAdvanceRef.current);
    }, [scheduleDate, scheduleTime, scheduleAddress, serviceAreaError, needsPartsOrder]);

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
                        <p>We'll contact you to schedule a time of day once your parts arrive. Just pick a date and confirm your location.</p>
                    </div>
                </div>
            ) : (
                <p className="quiz__subtitle">
                    Pick a date and time for your repair.
                </p>
            )}

            {/* Address / Location — shown first so pre-filled address is visible */}
            <div className="sched-section">
                <label className="sched-label">Your Location</label>
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
                    <p className="sched-hint">We come to your home, office, or wherever you are. Currently serving select cities in Texas.</p>
                )}
            </div>

            <div className="sched-section">
                <label className="sched-label">Pick a Date</label>
                <p className="sched-hint sched-hint--above">Available dates and times match our technicians' schedules.</p>
                <GuruCalendar
                    value={scheduleDate}
                    onChange={onDateChange}
                    minDate={minDateStr}
                    availableDates={availableDates}
                />
            </div>

            {/* Time slot — only shown when parts are in stock */}
            {!needsPartsOrder && (
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
            )}

            {needsPartsOrder && (
                <div className="sched-section">
                    <div className="quiz__inventory-banner quiz__inventory-banner--info">
                        <span className="quiz__inventory-banner-icon">🕐</span>
                        <div>
                            <strong>Time of day will be scheduled later</strong>
                            <p>Once your parts arrive, we'll reach out to confirm a specific time slot that works for you.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="quiz__actions">
                <button className="guru-btn guru-btn--ghost" onClick={onBack}>← Back</button>
                <button
                    className="guru-btn guru-btn--primary guru-btn--lg"
                    disabled={!scheduleDate || (!needsPartsOrder && !scheduleTime) || !scheduleAddress}
                    onClick={onNext}
                >
                    Review & Book →
                </button>
            </div>
        </div>
    );
}

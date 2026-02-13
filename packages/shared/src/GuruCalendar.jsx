import React, { useState, useMemo } from 'react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * @param {Object} props
 * @param {string} props.value - ISO date string (YYYY-MM-DD) or ''
 * @param {function} props.onChange - called with ISO date string
 * @param {string} [props.minDate] - ISO date string for minimum selectable date
 * @param {Set<string>} [props.availableDates] - if provided, only these dates are selectable (ISO strings)
 * @param {Object<string, string[]>} [props.availableSlots] - map of date -> available slot ids
 */
export default function GuruCalendar({ value, onChange, minDate, availableDates, availableSlots }) {
    const selected = value ? new Date(value + 'T00:00:00') : null;
    const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialMonth = selected || minDateObj || today;
    const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);
        const startDow = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days = [];

        // Leading blanks
        for (let i = 0; i < startDow; i++) {
            days.push(null);
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            days.push(new Date(viewYear, viewMonth, d));
        }

        return days;
    }, [viewYear, viewMonth]);

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(viewYear - 1);
            setViewMonth(11);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewYear(viewYear + 1);
            setViewMonth(0);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const canGoPrev = () => {
        if (!minDateObj) return true;
        const prevMonthLast = new Date(viewYear, viewMonth, 0);
        return prevMonthLast >= minDateObj;
    };

    const isDateDisabled = (date) => {
        if (!date) return true;
        if (minDateObj && date < minDateObj) return true;

        // If availableDates is provided, only those dates are selectable
        if (availableDates && availableDates.size > 0) {
            return !availableDates.has(toDateKey(date));
        }

        return false;
    };

    const isDateAvailable = (date) => {
        if (!date) return false;
        if (!availableDates || availableDates.size === 0) return true;
        return availableDates.has(toDateKey(date));
    };

    const handleSelectDate = (date) => {
        if (!date || isDateDisabled(date)) return;
        onChange(toDateKey(date));
    };

    return (
        <div className="guru-calendar">
            <div className="guru-calendar__header">
                <button
                    type="button"
                    className="guru-calendar__nav-btn"
                    onClick={goToPrevMonth}
                    disabled={!canGoPrev()}
                    aria-label="Previous month"
                >
                    &lsaquo;
                </button>
                <div className="guru-calendar__month-year">
                    {MONTHS[viewMonth]} {viewYear}
                </div>
                <button
                    type="button"
                    className="guru-calendar__nav-btn"
                    onClick={goToNextMonth}
                    aria-label="Next month"
                >
                    &rsaquo;
                </button>
            </div>

            <div className="guru-calendar__weekdays">
                {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="guru-calendar__weekday">{day}</div>
                ))}
            </div>

            <div className="guru-calendar__grid">
                {calendarDays.map((date, i) => {
                    if (!date) {
                        return <div key={`blank-${i}`} className="guru-calendar__day guru-calendar__day--blank" />;
                    }

                    const disabled = isDateDisabled(date);
                    const isSelected = selected && isSameDay(date, selected);
                    const isToday = isSameDay(date, today);
                    const hasAvailability = availableDates ? isDateAvailable(date) : null;

                    let className = 'guru-calendar__day';
                    if (disabled) className += ' guru-calendar__day--disabled';
                    if (isSelected) className += ' guru-calendar__day--selected';
                    if (isToday && !isSelected) className += ' guru-calendar__day--today';
                    if (hasAvailability === true && !disabled && !isSelected) className += ' guru-calendar__day--available';

                    return (
                        <button
                            key={toDateKey(date)}
                            type="button"
                            className={className}
                            onClick={() => handleSelectDate(date)}
                            disabled={disabled}
                            aria-label={`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                            aria-selected={isSelected}
                        >
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            {availableDates && availableDates.size > 0 && (
                <div className="guru-calendar__legend">
                    <span className="guru-calendar__legend-dot guru-calendar__legend-dot--available"></span>
                    <span className="guru-calendar__legend-text">Tech available</span>
                </div>
            )}
        </div>
    );
}

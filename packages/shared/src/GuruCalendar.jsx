import React, { useState, useMemo, useCallback } from 'react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(str) {
    if (!str || !ISO_DATE_RE.test(str)) return null;
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
}

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

function buildRangeLabel(start, end) {
    if (!start || !end) return '';
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

/**
 * @param {Object} props
 * @param {string} props.value - ISO date string (YYYY-MM-DD) or ''
 * @param {function} props.onChange - called with ISO date string
 * @param {string} [props.minDate] - ISO date string for minimum selectable date
 * @param {string} [props.maxDate] - ISO date string for maximum selectable date
 * @param {Set<string>} [props.availableDates] - if provided, only these dates are selectable (ISO strings)
 * @param {Object<string, string[]>} [props.availableSlots] - map of date -> available slot ids
 * @param {boolean} [props.showOnlyRange] - show only minDate..maxDate (not full month)
 * @param {string} [props.previewStartDate] - ISO date used for range preview start
 */
export default function GuruCalendar({
    value,
    onChange,
    minDate,
    maxDate,
    availableDates,
    availableSlots,
    disableUnavailable = true,
    showOnlyRange = false,
    previewStartDate,
}) {
    const selected = value ? parseISODate(value) : null;
    const minDateObj = minDate ? parseISODate(minDate) : null;
    const maxDateObj = maxDate ? parseISODate(maxDate) : null;
    const previewStartObj = previewStartDate ? parseISODate(previewStartDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const initialMonth = selected || minDateObj || today;
    const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
    const useRangeMode = showOnlyRange && minDateObj && maxDateObj;
    const rangeStartObj = useRangeMode ? (previewStartObj || minDateObj) : null;
    const rangeLabel = useMemo(() => buildRangeLabel(rangeStartObj, maxDateObj), [rangeStartObj, maxDateObj]);

    const calendarDays = useMemo(() => {
        if (useRangeMode) {
            const days = [];
            const startDate = rangeStartObj || minDateObj;
            const startDow = startDate.getDay();
            for (let i = 0; i < startDow; i++) {
                days.push(null);
            }
            const cursor = new Date(startDate);
            while (cursor <= maxDateObj) {
                days.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            return days;
        }

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
    }, [viewYear, viewMonth, useRangeMode, minDateObj, maxDateObj, rangeStartObj]);

    const goToPrevMonth = () => {
        if (useRangeMode) return;
        if (viewMonth === 0) {
            setViewYear(viewYear - 1);
            setViewMonth(11);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (useRangeMode) return;
        if (viewMonth === 11) {
            setViewYear(viewYear + 1);
            setViewMonth(0);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const canGoPrev = () => {
        if (useRangeMode) return false;
        if (!minDateObj) return true;
        const prevMonthLast = new Date(viewYear, viewMonth, 0);
        return prevMonthLast >= minDateObj;
    };

    const canGoNext = () => {
        if (useRangeMode) return false;
        if (!maxDateObj) return true;
        const nextMonthFirst = new Date(viewYear, viewMonth + 1, 1);
        return nextMonthFirst <= maxDateObj;
    };

    const isDateDisabled = (date) => {
        if (!date) return true;
        if (minDateObj && date < minDateObj) return true;
        if (maxDateObj && date > maxDateObj) return true;

        // If availableDates is provided and disabling is enabled, only those dates are selectable.
        // Important: an empty set means no dates are selectable.
        if (disableUnavailable && availableDates) {
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

    const handleGridKeyDown = useCallback((e) => {
        const focusable = e.currentTarget.querySelectorAll('button:not([disabled])');
        const arr = Array.from(focusable);
        const idx = arr.indexOf(document.activeElement);
        if (idx === -1) return;

        let next = -1;
        if (e.key === 'ArrowRight') next = Math.min(idx + 1, arr.length - 1);
        else if (e.key === 'ArrowLeft') next = Math.max(idx - 1, 0);
        else if (e.key === 'ArrowDown') next = Math.min(idx + 7, arr.length - 1);
        else if (e.key === 'ArrowUp') next = Math.max(idx - 7, 0);
        else if (e.key === 'Enter' || e.key === ' ') { arr[idx].click(); e.preventDefault(); return; }
        else return;

        e.preventDefault();
        arr[next]?.focus();
    }, []);

    return (
        <div className="guru-calendar">
            <div className="guru-calendar__header">
                {!useRangeMode && (
                    <button
                        type="button"
                        className="guru-calendar__nav-btn"
                        onClick={goToPrevMonth}
                        disabled={!canGoPrev()}
                        aria-label="Previous month"
                    >
                        &lsaquo;
                    </button>
                )}
                <div className="guru-calendar__month-year">
                    {useRangeMode ? rangeLabel : `${MONTHS[viewMonth]} ${viewYear}`}
                </div>
                {!useRangeMode && (
                    <button
                        type="button"
                        className="guru-calendar__nav-btn"
                        onClick={goToNextMonth}
                        disabled={!canGoNext()}
                        aria-label="Next month"
                    >
                        &rsaquo;
                    </button>
                )}
            </div>

            <div className="guru-calendar__weekdays">
                {DAYS_OF_WEEK.map((day) => (
                    <div key={day} className="guru-calendar__weekday">{day}</div>
                ))}
            </div>

            <div className="guru-calendar__grid" role="grid" aria-label="Choose a date" onKeyDown={handleGridKeyDown}>
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
                            tabIndex={disabled ? -1 : 0}
                            aria-disabled={disabled || undefined}
                            aria-label={`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                            aria-selected={isSelected}
                            aria-current={isSelected ? 'date' : undefined}
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

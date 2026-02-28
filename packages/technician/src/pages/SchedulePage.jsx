import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@shared/supabase';
import { TIME_SLOTS, SCHEDULING_LEAD_DAYS, toLocalDateKey, formatDisplayDate } from '@shared/constants';
import GuruCalendar from '@shared/GuruCalendar';
import '@shared/guru-calendar.css';
import TechNav from '../components/TechNav';

export default function SchedulePage() {
    const [selectedDate, setSelectedDate] = useState('');
    const [scheduleMap, setScheduleMap] = useState({}); // { 'YYYY-MM-DD': { id, time_slots, is_available } }
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved'
    const saveTimerRef = useRef(null);
    const saveStatusTimerRef = useRef(null);

    const todayStr = toLocalDateKey(new Date());

    // Fetch existing schedule
    useEffect(() => {
        const fetchSchedule = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('tech_schedules')
                .select('id, schedule_date, time_slots, is_available')
                .eq('technician_id', user.id)
                .gte('schedule_date', todayStr)
                .order('schedule_date', { ascending: true });

            if (!error && data) {
                const map = {};
                data.forEach((row) => {
                    map[row.schedule_date] = {
                        id: row.id,
                        time_slots: Array.isArray(row.time_slots) ? row.time_slots : [],
                        is_available: row.is_available,
                    };
                });
                setScheduleMap(map);
            }
            setLoading(false);
        };

        fetchSchedule();
    }, [todayStr]);

    // Available dates set for the calendar (show dots on dates that have availability)
    const availableDatesSet = useMemo(() => {
        const set = new Set();
        Object.entries(scheduleMap).forEach(([date, entry]) => {
            if (entry.is_available && entry.time_slots.length > 0) {
                set.add(date);
            }
        });
        return set;
    }, [scheduleMap]);

    const currentEntry = selectedDate ? scheduleMap[selectedDate] : null;
    const currentSlots = currentEntry?.time_slots || [];
    const isAvailable = currentEntry?.is_available ?? false;

    const toggleSlot = (slotId) => {
        const newSlots = currentSlots.includes(slotId)
            ? currentSlots.filter((s) => s !== slotId)
            : [...currentSlots, slotId];

        setScheduleMap((prev) => ({
            ...prev,
            [selectedDate]: {
                ...prev[selectedDate],
                time_slots: newSlots,
                is_available: newSlots.length > 0,
            },
        }));
    };

    const toggleAvailableForDate = () => {
        if (isAvailable) {
            // Turning off availability
            setScheduleMap((prev) => ({
                ...prev,
                [selectedDate]: {
                    ...prev[selectedDate],
                    time_slots: [],
                    is_available: false,
                },
            }));
        } else {
            // Turning on with all slots
            setScheduleMap((prev) => ({
                ...prev,
                [selectedDate]: {
                    ...prev[selectedDate],
                    time_slots: ['morning', 'afternoon', 'evening'],
                    is_available: true,
                },
            }));
        }
    };

    const saveScheduleForDate = useCallback(async (dateToSave, mapSnapshot) => {
        if (!dateToSave) return;
        setSaving(true);
        setSaveStatus('saving');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSaving(false);
            setSaveStatus('');
            return;
        }

        const entry = mapSnapshot[dateToSave];
        const slots = entry?.time_slots || [];
        const available = entry?.is_available ?? false;

        if (entry?.id) {
            await supabase
                .from('tech_schedules')
                .update({ time_slots: slots, is_available: available })
                .eq('id', entry.id);
        } else {
            const { data } = await supabase
                .from('tech_schedules')
                .insert({
                    technician_id: user.id,
                    schedule_date: dateToSave,
                    time_slots: slots,
                    is_available: available,
                })
                .select('id')
                .single();

            if (data) {
                setScheduleMap((prev) => ({
                    ...prev,
                    [dateToSave]: { ...prev[dateToSave], id: data.id },
                }));
            }
        }

        setSaving(false);
        setSaveStatus('saved');
        clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => setSaveStatus(''), 2000);
    }, []);

    // Auto-save when schedule entry changes (debounced)
    const pendingSaveRef = useRef(null);
    useEffect(() => {
        if (!selectedDate || loading) return;
        const entry = scheduleMap[selectedDate];
        // Only auto-save if user has interacted (entry exists in map)
        if (!entry) return;

        clearTimeout(saveTimerRef.current);
        pendingSaveRef.current = { date: selectedDate, map: { ...scheduleMap } };
        saveTimerRef.current = setTimeout(() => {
            if (pendingSaveRef.current) {
                saveScheduleForDate(pendingSaveRef.current.date, pendingSaveRef.current.map);
            }
        }, 600);

        return () => clearTimeout(saveTimerRef.current);
    }, [scheduleMap, selectedDate, loading, saveScheduleForDate]);

    const removeDate = async () => {
        if (!selectedDate) return;
        const entry = scheduleMap[selectedDate];

        if (entry?.id) {
            setSaving(true);
            await supabase
                .from('tech_schedules')
                .delete()
                .eq('id', entry.id);
            setSaving(false);
        }

        setScheduleMap((prev) => {
            const copy = { ...prev };
            delete copy[selectedDate];
            return copy;
        });
        setSelectedDate('');
    };

    // Count upcoming available dates
    const upcomingCount = Object.values(scheduleMap).filter(
        (e) => e.is_available && e.time_slots.length > 0
    ).length;

    return (
        <>
            <TechNav />

            <div className="queue-page">
                <div className="guru-container" style={{ maxWidth: 800 }}>
                    <div className="queue-header" style={{ marginBottom: 24 }}>
                        <div>
                            <h1 className="queue-header__title">My Schedule</h1>
                            <p className="queue-header__count">
                                {loading ? 'Loading...' : `${upcomingCount} available day${upcomingCount !== 1 ? 's' : ''} set`}
                            </p>
                        </div>
                    </div>

                    <div className="schedule-hint">
                        Customers can book {SCHEDULING_LEAD_DAYS}+ days out. Set your availability in advance so customers can find open slots.
                    </div>

                    <div className="schedule-layout">
                        {/* Calendar */}
                        <div className="schedule-layout__calendar">
                            <GuruCalendar
                                value={selectedDate}
                                onChange={setSelectedDate}
                                minDate={todayStr}
                                availableDates={availableDatesSet.size > 0 ? availableDatesSet : null}
                                disableUnavailable={false}
                            />
                        </div>

                        {/* Slot Editor */}
                        <div className="schedule-layout__editor">
                            {selectedDate ? (
                                <div className="repair-detail__section" style={{ marginBottom: 0 }}>
                                    <h2 className="repair-detail__section-title">
                                        {formatDisplayDate(selectedDate)}
                                    </h2>

                                    {/* Availability Toggle */}
                                    <div className="schedule-toggle" onClick={toggleAvailableForDate}>
                                        <div className={`schedule-toggle__track ${isAvailable ? 'schedule-toggle__track--on' : ''}`}>
                                            <div className="schedule-toggle__thumb" />
                                        </div>
                                        <span className="schedule-toggle__label">
                                            {isAvailable ? 'Available for repairs' : 'Not available'}
                                        </span>
                                    </div>

                                    {/* Time Slots */}
                                    {isAvailable && (
                                        <div className="schedule-slots">
                                            <p className="schedule-slots__hint">Select time windows you can work:</p>
                                            {TIME_SLOTS.map((slot) => {
                                                const active = currentSlots.includes(slot.id);
                                                return (
                                                    <button
                                                        key={slot.id}
                                                        className={`schedule-slot-btn ${active ? 'schedule-slot-btn--active' : ''}`}
                                                        onClick={() => toggleSlot(slot.id)}
                                                        disabled={saving}
                                                    >
                                                        <div className="schedule-slot-btn__check">
                                                            {active ? '\u2713' : ''}
                                                        </div>
                                                        <div className="schedule-slot-btn__info">
                                                            <span className="schedule-slot-btn__label">{slot.label}</span>
                                                            <span className="schedule-slot-btn__range">{slot.range}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="schedule-actions">
                                        {saveStatus === 'saving' && (
                                            <span className="schedule-save-status">Saving...</span>
                                        )}
                                        {saveStatus === 'saved' && (
                                            <span className="schedule-save-status schedule-save-status--done">Saved</span>
                                        )}
                                        {currentEntry?.id && (
                                            <button
                                                className="guru-btn guru-btn--ghost"
                                                onClick={removeDate}
                                                disabled={saving}
                                                style={{ color: 'var(--dark-error)' }}
                                            >
                                                Remove Date
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="repair-detail__section" style={{ marginBottom: 0, textAlign: 'center', padding: '3rem 1.5rem' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.5 }}>📅</div>
                                    <p style={{ color: 'var(--dark-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        Select a date on the calendar to set your availability
                                    </p>
                                </div>
                            )}

                            {/* Upcoming Schedule Summary */}
                            {Object.keys(scheduleMap).length > 0 && (
                                <div className="repair-detail__section" style={{ marginTop: 16, marginBottom: 0 }}>
                                    <h2 className="repair-detail__section-title">Upcoming Availability</h2>
                                    <div className="schedule-upcoming-list">
                                        {Object.entries(scheduleMap)
                                            .filter(([, entry]) => entry.is_available && entry.time_slots.length > 0)
                                            .sort(([a], [b]) => a.localeCompare(b))
                                            .slice(0, 7)
                                            .map(([date, entry]) => (
                                                <button
                                                    key={date}
                                                    className={`schedule-upcoming-item ${selectedDate === date ? 'schedule-upcoming-item--active' : ''}`}
                                                    onClick={() => setSelectedDate(date)}
                                                >
                                                    <span className="schedule-upcoming-item__date">
                                                        {formatDisplayDate(date).split(',').slice(0, 2).join(',')}
                                                    </span>
                                                    <span className="schedule-upcoming-item__slots">
                                                        {entry.time_slots.length} slot{entry.time_slots.length !== 1 ? 's' : ''}
                                                    </span>
                                                </button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

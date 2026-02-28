/**
 * Guru — Lightweight Analytics Tracker
 * Tracks page views, button clicks, session duration, and funnel events.
 * Events are batched and flushed to Supabase every few seconds to minimize requests.
 */

import { supabase } from './supabase.js';

// ─── Session ID (persists per browser tab) ──────────────────────────────────

function getSessionId() {
    let id = sessionStorage.getItem('guru_session_id');
    if (!id) {
        id = crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem('guru_session_id', id);
    }
    return id;
}

// ─── Device detection ───────────────────────────────────────────────────────

function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
}

// ─── Event queue & batching ─────────────────────────────────────────────────

let eventQueue = [];
let flushTimer = null;
let retryCount = 0;
const FLUSH_INTERVAL = 3000;
const MAX_BATCH = 20;
const MAX_RETRIES = 3;
const MAX_QUEUE_SIZE = 200;

function scheduleFlush() {
    if (flushTimer) return;
    const delay = retryCount > 0
        ? Math.min(FLUSH_INTERVAL * Math.pow(2, retryCount), 30000)
        : FLUSH_INTERVAL;
    flushTimer = setTimeout(flushEvents, delay);
}

async function flushEvents() {
    flushTimer = null;
    if (eventQueue.length === 0) return;

    const batch = eventQueue.splice(0, MAX_BATCH);
    try {
        const { error } = await supabase.from('site_events').insert(batch);
        if (error) {
            if (retryCount < MAX_RETRIES) {
                eventQueue.unshift(...batch);
                retryCount++;
                scheduleFlush();
            }
            return;
        }
        retryCount = 0;
    } catch (_err) {
        if (retryCount < MAX_RETRIES) {
            eventQueue.unshift(...batch);
            retryCount++;
            scheduleFlush();
        }
        return;
    }

    if (eventQueue.length > 0) scheduleFlush();
}

// ─── Core track function ────────────────────────────────────────────────────

function track(eventType, eventTarget, eventData = {}) {
    if (eventQueue.length >= MAX_QUEUE_SIZE) return;

    const event = {
        session_id: getSessionId(),
        event_type: eventType,
        event_target: eventTarget || null,
        event_data: eventData,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
    };

    eventQueue.push(event);
    scheduleFlush();
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const analytics = {
    pageView(path) {
        track('page_view', path || window.location.pathname);
    },

    buttonClick(buttonName, extraData = {}) {
        track('button_click', buttonName, extraData);
    },

    quizStart() {
        track('quiz_start', 'repair_quiz');
    },

    quizStep(stepName, stepData = {}) {
        track('quiz_step', stepName, stepData);
    },

    quizComplete(repairData = {}) {
        track('quiz_complete', 'repair_quiz', repairData);
    },

    login() {
        track('login', null);
    },

    signup() {
        track('signup', null);
    },

    bookingComplete(bookingData = {}) {
        track('booking_complete', 'repair_booking', bookingData);
    },

    flush() {
        flushEvents();
    },
};

// ─── Session tracking ───────────────────────────────────────────────────────

let sessionStartTime = null;
let sessionEndSent = false;

export function initSessionTracking() {
    sessionStartTime = Date.now();
    sessionEndSent = false;
    track('session_start', null);

    const handleUnload = () => {
        if (sessionEndSent) return;
        sessionEndSent = true;

        if (sessionStartTime) {
            const duration = Date.now() - sessionStartTime;
            const event = {
                session_id: getSessionId(),
                event_type: 'session_end',
                event_target: null,
                event_data: {},
                page_path: window.location.pathname,
                referrer: document.referrer || null,
                user_agent: navigator.userAgent,
                device_type: getDeviceType(),
                session_duration_ms: duration,
            };
            eventQueue.push(event);
        }

        if (eventQueue.length > 0) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseKey) {
                const url = `${supabaseUrl}/rest/v1/site_events`;
                try {
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'return=minimal',
                        },
                        body: JSON.stringify(eventQueue),
                        keepalive: true,
                    });
                    eventQueue = [];
                } catch (_) {
                    // Best-effort delivery on page close
                }
            }
        }
    };

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') handleUnload();
    });
}

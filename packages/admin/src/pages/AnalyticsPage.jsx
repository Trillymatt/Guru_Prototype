import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';

const EVENT_LABELS = {
    page_view: 'Page Views',
    button_click: 'Button Clicks',
    session_start: 'Sessions Started',
    session_end: 'Sessions Ended',
    quiz_start: 'Quiz Started',
    quiz_step: 'Quiz Steps',
    quiz_complete: 'Quiz Completed',
    login: 'Logins',
    signup: 'Signups',
    booking_complete: 'Bookings',
};

const PERIOD_OPTIONS = [
    { value: 7, label: 'Last 7 days' },
    { value: 14, label: 'Last 14 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
];

export default function AnalyticsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        fetchEvents();
    }, [period]);

    async function fetchEvents() {
        setLoading(true);
        if (!supabaseAdmin) {
            setLoading(false);
            return;
        }

        const since = new Date();
        since.setDate(since.getDate() - period);

        const { data, error } = await supabaseAdmin
            .from('site_events')
            .select('*')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false });

        if (!error) {
            setEvents(data || []);
        }
        setLoading(false);
    }

    const stats = useMemo(() => {
        // Event counts by type
        const byType = {};
        events.forEach(e => {
            byType[e.event_type] = (byType[e.event_type] || 0) + 1;
        });

        // Unique sessions
        const uniqueSessions = new Set(events.map(e => e.session_id)).size;

        // Average session duration
        const sessionEnds = events.filter(e => e.event_type === 'session_end' && e.session_duration_ms);
        const avgDuration = sessionEnds.length > 0
            ? sessionEnds.reduce((sum, e) => sum + e.session_duration_ms, 0) / sessionEnds.length
            : 0;

        // Page views by path
        const pageViews = {};
        events.filter(e => e.event_type === 'page_view').forEach(e => {
            const path = e.event_target || e.page_path || '/';
            pageViews[path] = (pageViews[path] || 0) + 1;
        });

        // Button clicks by name
        const buttonClicks = {};
        events.filter(e => e.event_type === 'button_click').forEach(e => {
            const name = e.event_target || 'unknown';
            buttonClicks[name] = (buttonClicks[name] || 0) + 1;
        });

        // Device breakdown
        const devices = { mobile: 0, tablet: 0, desktop: 0 };
        const sessionStarts = events.filter(e => e.event_type === 'session_start');
        sessionStarts.forEach(e => {
            if (e.device_type && devices[e.device_type] !== undefined) {
                devices[e.device_type]++;
            }
        });

        // Quiz funnel
        const quizStarts = byType['quiz_start'] || 0;
        const quizCompletes = byType['quiz_complete'] || 0;
        const quizConversion = quizStarts > 0 ? ((quizCompletes / quizStarts) * 100).toFixed(1) : '0';

        // Per-step funnel: count unique sessions that reached each step
        const FUNNEL_STEPS = [
            { key: 'quiz_start', label: 'Started Quiz' },
            { key: 'Your name & email', label: 'Name & Email' },
            { key: 'Phone number', label: 'Phone Number' },
            { key: 'Choose device', label: 'Choose Device' },
            { key: 'Choose repairs', label: 'Choose Repairs' },
            { key: 'Choose quality', label: 'Choose Quality' },
            { key: 'Add address', label: 'Add Address' },
            { key: 'Pick date', label: 'Pick Date' },
            { key: 'Review & book', label: 'Review & Book' },
            { key: 'quiz_complete', label: 'Completed' },
        ];

        // Build set of sessions that reached each step
        const sessionsByStep = {};
        FUNNEL_STEPS.forEach(s => { sessionsByStep[s.key] = new Set(); });

        events.forEach(e => {
            if (e.event_type === 'quiz_start' && e.session_id) {
                sessionsByStep['quiz_start'].add(e.session_id);
            } else if (e.event_type === 'quiz_step' && e.event_target && e.session_id) {
                if (sessionsByStep[e.event_target]) {
                    sessionsByStep[e.event_target].add(e.session_id);
                }
            } else if (e.event_type === 'quiz_complete' && e.session_id) {
                sessionsByStep['quiz_complete'].add(e.session_id);
            }
        });

        const quizFunnel = FUNNEL_STEPS.map((s, i) => {
            const count = sessionsByStep[s.key].size;
            const prevCount = i === 0 ? count : sessionsByStep[FUNNEL_STEPS[i - 1].key].size;
            const dropoff = prevCount > 0 ? (((prevCount - count) / prevCount) * 100).toFixed(0) : '0';
            return { ...s, count, dropoff: i === 0 ? null : `${dropoff}%` };
        });

        // Daily visitors (sessions per day)
        const dailyVisitors = {};
        events.filter(e => e.event_type === 'session_start').forEach(e => {
            const day = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyVisitors[day] = (dailyVisitors[day] || 0) + 1;
        });

        // Convert to array sorted by date
        const dailyTrend = Object.entries(dailyVisitors)
            .map(([label, count]) => ({ label, count }))
            .slice(-14); // Last 14 days max for chart

        return {
            byType,
            uniqueSessions,
            avgDuration,
            pageViews,
            buttonClicks,
            devices,
            quizStarts,
            quizCompletes,
            quizConversion,
            quizFunnel,
            dailyTrend,
        };
    }, [events]);

    function formatDuration(ms) {
        if (!ms) return '0s';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }

    const BUTTON_LABELS = {
        hero_start_repair: 'Hero — Start a Repair',
        hero_how_it_works: 'Hero — See How It Works',
        hiw_start_repair: 'How It Works — Start Repair',
        cta_start_repair: 'Bottom CTA — Start Repair',
    };

    if (loading) return <div className="admin-page"><div className="admin-loading">Loading analytics...</div></div>;

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Analytics</h1>
                    <p className="admin-page__subtitle">Customer site activity tracking</p>
                </div>
                <div className="admin-filters__tabs">
                    {PERIOD_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            className={`admin-filters__tab ${period === opt.value ? 'admin-filters__tab--active' : ''}`}
                            onClick={() => setPeriod(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.uniqueSessions}</span>
                    <span className="admin-stat-card__label">Unique Visitors</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.byType['page_view'] || 0}</span>
                    <span className="admin-stat-card__label">Page Views</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatDuration(stats.avgDuration)}</span>
                    <span className="admin-stat-card__label">Avg. Session Duration</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.quizConversion}%</span>
                    <span className="admin-stat-card__label">Quiz Conversion Rate</span>
                </div>
            </div>

            {/* Quiz Funnel */}
            <div className="admin-stats-row">
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">{stats.quizStarts}</span>
                    <span className="admin-stat-card__label">Quiz Started</span>
                </div>
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">{stats.quizCompletes}</span>
                    <span className="admin-stat-card__label">Quiz Completed</span>
                </div>
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">{stats.byType['booking_complete'] || 0}</span>
                    <span className="admin-stat-card__label">Bookings Made</span>
                </div>
            </div>

            {/* Quiz Step Funnel */}
            {stats.quizFunnel[0].count > 0 && (
                <div className="admin-chart-card" style={{ marginBottom: 20 }}>
                    <h3 className="admin-chart-card__title">Quiz Drop-off Funnel</h3>
                    <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', marginTop: -12, marginBottom: 16 }}>
                        Unique sessions reaching each step
                    </p>
                    <div className="admin-funnel">
                        {stats.quizFunnel.map((step, i) => {
                            const maxCount = stats.quizFunnel[0].count || 1;
                            const widthPct = Math.max((step.count / maxCount) * 100, 8);
                            const isLast = i === stats.quizFunnel.length - 1;
                            return (
                                <div key={step.key} className="admin-funnel__row">
                                    <span className="admin-funnel__label">{step.label}</span>
                                    <div className="admin-funnel__bar-wrap">
                                        <div
                                            className={`admin-funnel__bar ${isLast ? 'admin-funnel__bar--complete' : ''}`}
                                            style={{ width: `${widthPct}%` }}
                                        >
                                            <span className="admin-funnel__count">{step.count}</span>
                                        </div>
                                    </div>
                                    <span className={`admin-funnel__dropoff ${step.dropoff && step.dropoff !== '0%' ? 'admin-funnel__dropoff--loss' : ''}`}>
                                        {step.dropoff ? `−${step.dropoff}` : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="admin-charts-grid">
                {/* Daily Visitors Chart */}
                {stats.dailyTrend.length > 0 && (
                    <div className="admin-chart-card">
                        <h3 className="admin-chart-card__title">Daily Visitors</h3>
                        <div className="admin-bar-chart">
                            {stats.dailyTrend.map((day, i) => {
                                const maxVal = Math.max(...stats.dailyTrend.map(d => d.count), 1);
                                return (
                                    <div key={i} className="admin-bar-chart__col">
                                        <div className="admin-bar-chart__bar-wrap">
                                            <div
                                                className="admin-bar-chart__bar"
                                                style={{ height: `${(day.count / maxVal) * 100}%` }}
                                            >
                                                <span className="admin-bar-chart__value">{day.count}</span>
                                            </div>
                                        </div>
                                        <span className="admin-bar-chart__label">{day.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top Pages */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Top Pages</h3>
                    <div className="admin-breakdown-list">
                        {Object.entries(stats.pageViews)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([path, count]) => {
                                const maxVal = Math.max(...Object.values(stats.pageViews), 1);
                                return (
                                    <div key={path} className="admin-breakdown-item">
                                        <div className="admin-breakdown-item__header">
                                            <span className="admin-breakdown-item__name admin-breakdown-item__name--mono">{path}</span>
                                            <span className="admin-breakdown-item__value">{count} views</span>
                                        </div>
                                        <div className="admin-breakdown-item__bar-bg">
                                            <div
                                                className="admin-breakdown-item__bar"
                                                style={{ width: `${(count / maxVal) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Button Clicks */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Button Clicks</h3>
                    {Object.keys(stats.buttonClicks).length === 0 ? (
                        <p className="admin-chart-card__empty">No button clicks recorded yet</p>
                    ) : (
                        <div className="admin-breakdown-list">
                            {Object.entries(stats.buttonClicks)
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, count]) => {
                                    const maxVal = Math.max(...Object.values(stats.buttonClicks), 1);
                                    return (
                                        <div key={name} className="admin-breakdown-item">
                                            <div className="admin-breakdown-item__header">
                                                <span className="admin-breakdown-item__name">{BUTTON_LABELS[name] || name}</span>
                                                <span className="admin-breakdown-item__value">{count} clicks</span>
                                            </div>
                                            <div className="admin-breakdown-item__bar-bg">
                                                <div
                                                    className="admin-breakdown-item__bar admin-breakdown-item__bar--accent"
                                                    style={{ width: `${(count / maxVal) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Device Breakdown */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Device Breakdown</h3>
                    <div className="admin-device-breakdown">
                        {[
                            { key: 'mobile', label: 'Mobile', icon: '📱' },
                            { key: 'desktop', label: 'Desktop', icon: '💻' },
                            { key: 'tablet', label: 'Tablet', icon: '📋' },
                        ].map(d => {
                            const total = stats.devices.mobile + stats.devices.desktop + stats.devices.tablet;
                            const pct = total > 0 ? ((stats.devices[d.key] / total) * 100).toFixed(0) : 0;
                            return (
                                <div key={d.key} className="admin-device-breakdown__item">
                                    <span className="admin-device-breakdown__icon">{d.icon}</span>
                                    <span className="admin-device-breakdown__label">{d.label}</span>
                                    <span className="admin-device-breakdown__value">{stats.devices[d.key]}</span>
                                    <span className="admin-device-breakdown__pct">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Event Counts */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">All Events</h3>
                    <div className="admin-breakdown-list">
                        {Object.entries(stats.byType)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, count]) => (
                                <div key={type} className="admin-breakdown-item">
                                    <div className="admin-breakdown-item__header">
                                        <span className="admin-breakdown-item__name">{EVENT_LABELS[type] || type}</span>
                                        <span className="admin-breakdown-item__value">{count}</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';

const PERIOD_OPTIONS = [
    { value: 7, label: 'Last 7 days' },
    { value: 14, label: 'Last 14 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
];

function parseDomain(url) {
    if (!url) return null;
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        return hostname || null;
    } catch (_) {
        return null;
    }
}

function classifySource(referrer, eventData) {
    // UTM source takes priority
    if (eventData?.utm_source) return eventData.utm_source;

    const domain = parseDomain(referrer);
    if (!domain) return 'Direct';

    if (/google\./i.test(domain)) return 'Google';
    if (/facebook\.com|fb\.com|instagram\.com/i.test(domain)) return 'Facebook / Instagram';
    if (/tiktok\.com/i.test(domain)) return 'TikTok';
    if (/twitter\.com|x\.com/i.test(domain)) return 'X (Twitter)';
    if (/youtube\.com|youtu\.be/i.test(domain)) return 'YouTube';
    if (/snapchat\.com/i.test(domain)) return 'Snapchat';
    if (/bing\.com/i.test(domain)) return 'Bing';
    if (/yahoo\.com/i.test(domain)) return 'Yahoo';
    if (/linkedin\.com/i.test(domain)) return 'LinkedIn';
    if (/reddit\.com/i.test(domain)) return 'Reddit';
    if (/nextdoor\.com/i.test(domain)) return 'Nextdoor';
    if (/yelp\.com/i.test(domain)) return 'Yelp';

    return domain;
}

function classifyMedium(referrer, eventData) {
    if (eventData?.utm_medium) return eventData.utm_medium;

    const domain = parseDomain(referrer);
    if (!domain) return 'direct';
    if (/google\.|bing\.|yahoo\.|duckduckgo\./i.test(domain)) return 'organic';
    if (/facebook|instagram|tiktok|twitter|x\.com|youtube|snapchat|linkedin|reddit|nextdoor/i.test(domain)) return 'social';
    return 'referral';
}

export default function AcquisitionPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);
    const [view, setView] = useState('source'); // source | medium | campaign | referrer

    useEffect(() => {
        fetchEvents();
    }, [period]);

    async function fetchEvents() {
        setLoading(true);
        if (!supabaseAdmin) { setLoading(false); return; }

        const since = new Date();
        since.setDate(since.getDate() - period);

        const { data, error } = await supabaseAdmin
            .from('site_events')
            .select('*')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false });

        if (!error) setEvents(data || []);
        setLoading(false);
    }

    const stats = useMemo(() => {
        const sessions = events.filter(e => e.event_type === 'session_start');
        const signups = events.filter(e => e.event_type === 'signup');
        const bookings = events.filter(e => e.event_type === 'booking_complete');

        // Build per-session lookup for first-touch attribution
        const sessionMap = {};
        sessions.forEach(e => {
            sessionMap[e.session_id] = {
                referrer: e.referrer,
                eventData: e.event_data || {},
            };
        });

        // Source breakdown (from session_start events)
        const bySource = {};
        sessions.forEach(e => {
            const source = classifySource(e.referrer, e.event_data);
            if (!bySource[source]) bySource[source] = { sessions: 0, signups: 0, bookings: 0 };
            bySource[source].sessions++;
        });

        // Attribute signups and bookings to their session's source
        signups.forEach(e => {
            const sess = sessionMap[e.session_id];
            const source = sess ? classifySource(sess.referrer, sess.eventData) : 'Direct';
            if (!bySource[source]) bySource[source] = { sessions: 0, signups: 0, bookings: 0 };
            bySource[source].signups++;
        });
        bookings.forEach(e => {
            const sess = sessionMap[e.session_id];
            const source = sess ? classifySource(sess.referrer, sess.eventData) : 'Direct';
            if (!bySource[source]) bySource[source] = { sessions: 0, signups: 0, bookings: 0 };
            bySource[source].bookings++;
        });

        // Medium breakdown
        const byMedium = {};
        sessions.forEach(e => {
            const medium = classifyMedium(e.referrer, e.event_data);
            if (!byMedium[medium]) byMedium[medium] = { sessions: 0, signups: 0, bookings: 0 };
            byMedium[medium].sessions++;
        });
        signups.forEach(e => {
            const sess = sessionMap[e.session_id];
            const medium = sess ? classifyMedium(sess.referrer, sess.eventData) : 'direct';
            if (!byMedium[medium]) byMedium[medium] = { sessions: 0, signups: 0, bookings: 0 };
            byMedium[medium].signups++;
        });
        bookings.forEach(e => {
            const sess = sessionMap[e.session_id];
            const medium = sess ? classifyMedium(sess.referrer, sess.eventData) : 'direct';
            if (!byMedium[medium]) byMedium[medium] = { sessions: 0, signups: 0, bookings: 0 };
            byMedium[medium].bookings++;
        });

        // Campaign breakdown (UTM only)
        const byCampaign = {};
        sessions.forEach(e => {
            const campaign = e.event_data?.utm_campaign;
            if (!campaign) return;
            if (!byCampaign[campaign]) byCampaign[campaign] = { sessions: 0, signups: 0, bookings: 0 };
            byCampaign[campaign].sessions++;
        });
        signups.forEach(e => {
            const sess = sessionMap[e.session_id];
            const campaign = sess?.eventData?.utm_campaign;
            if (!campaign) return;
            if (!byCampaign[campaign]) byCampaign[campaign] = { sessions: 0, signups: 0, bookings: 0 };
            byCampaign[campaign].signups++;
        });
        bookings.forEach(e => {
            const sess = sessionMap[e.session_id];
            const campaign = sess?.eventData?.utm_campaign;
            if (!campaign) return;
            if (!byCampaign[campaign]) byCampaign[campaign] = { sessions: 0, signups: 0, bookings: 0 };
            byCampaign[campaign].bookings++;
        });

        // Raw referrer domains
        const byReferrer = {};
        sessions.forEach(e => {
            const domain = parseDomain(e.referrer) || '(direct)';
            if (!byReferrer[domain]) byReferrer[domain] = { sessions: 0, signups: 0, bookings: 0 };
            byReferrer[domain].sessions++;
        });
        signups.forEach(e => {
            const sess = sessionMap[e.session_id];
            const domain = (sess && parseDomain(sess.referrer)) || '(direct)';
            if (!byReferrer[domain]) byReferrer[domain] = { sessions: 0, signups: 0, bookings: 0 };
            byReferrer[domain].signups++;
        });
        bookings.forEach(e => {
            const sess = sessionMap[e.session_id];
            const domain = (sess && parseDomain(sess.referrer)) || '(direct)';
            if (!byReferrer[domain]) byReferrer[domain] = { sessions: 0, signups: 0, bookings: 0 };
            byReferrer[domain].bookings++;
        });

        // Totals
        const totalSessions = sessions.length;
        const totalSignups = signups.length;
        const totalBookings = bookings.length;

        // Sources with UTM data
        const utmSessions = sessions.filter(e => e.event_data?.utm_source).length;

        return {
            bySource,
            byMedium,
            byCampaign,
            byReferrer,
            totalSessions,
            totalSignups,
            totalBookings,
            utmSessions,
        };
    }, [events]);

    const viewData = view === 'source' ? stats.bySource
        : view === 'medium' ? stats.byMedium
        : view === 'campaign' ? stats.byCampaign
        : stats.byReferrer;

    const sortedEntries = Object.entries(viewData).sort((a, b) => b[1].sessions - a[1].sessions);
    const maxSessions = sortedEntries.length > 0 ? Math.max(...sortedEntries.map(e => e[1].sessions), 1) : 1;

    if (loading) return <div className="admin-page"><div className="admin-loading">Loading acquisition data...</div></div>;

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Acquisition</h1>
                    <p className="admin-page__subtitle">Where your customers come from</p>
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
                    <span className="admin-stat-card__value">{stats.totalSessions}</span>
                    <span className="admin-stat-card__label">Total Sessions</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{Object.keys(stats.bySource).length}</span>
                    <span className="admin-stat-card__label">Traffic Sources</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.totalSignups}</span>
                    <span className="admin-stat-card__label">Signups</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.totalBookings}</span>
                    <span className="admin-stat-card__label">Bookings</span>
                </div>
            </div>

            {/* View Tabs */}
            <div className="admin-filters" style={{ marginBottom: 24 }}>
                <div className="admin-filters__tabs">
                    {[
                        { value: 'source', label: 'By Source' },
                        { value: 'medium', label: 'By Medium' },
                        { value: 'campaign', label: 'By Campaign' },
                        { value: 'referrer', label: 'By Referrer Domain' },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            className={`admin-filters__tab ${view === tab.value ? 'admin-filters__tab--active' : ''}`}
                            onClick={() => setView(tab.value)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {sortedEntries.length === 0 ? (
                <div className="admin-empty">
                    {view === 'campaign'
                        ? 'No UTM campaign data yet. Add ?utm_campaign=... to your links to start tracking.'
                        : 'No acquisition data for this period'}
                </div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{view === 'referrer' ? 'Domain' : view === 'campaign' ? 'Campaign' : view === 'medium' ? 'Medium' : 'Source'}</th>
                                <th>Sessions</th>
                                <th>Share</th>
                                <th>Signups</th>
                                <th>Bookings</th>
                                <th>Conversion</th>
                                <th style={{ width: '30%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEntries.map(([name, data]) => {
                                const share = stats.totalSessions > 0
                                    ? ((data.sessions / stats.totalSessions) * 100).toFixed(1)
                                    : '0';
                                const conversion = data.sessions > 0
                                    ? ((data.bookings / data.sessions) * 100).toFixed(1)
                                    : '0';
                                return (
                                    <tr key={name}>
                                        <td>
                                            <span className="admin-table__name">{name}</span>
                                        </td>
                                        <td>{data.sessions}</td>
                                        <td>{share}%</td>
                                        <td>{data.signups || 0}</td>
                                        <td>{data.bookings || 0}</td>
                                        <td>
                                            {data.bookings > 0 ? (
                                                <span style={{ color: 'var(--admin-success)', fontWeight: 600 }}>{conversion}%</span>
                                            ) : (
                                                <span style={{ color: 'var(--admin-text-muted)' }}>0%</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="admin-breakdown-item__bar-bg">
                                                <div
                                                    className="admin-breakdown-item__bar"
                                                    style={{ width: `${(data.sessions / maxSessions) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Top Referrer Domains Quick View (shown on source/medium views) */}
            {(view === 'source' || view === 'medium') && (
                <div className="admin-charts-grid" style={{ marginTop: 24 }}>
                    <div className="admin-chart-card">
                        <h3 className="admin-chart-card__title">Top Referrer Domains</h3>
                        {Object.keys(stats.byReferrer).length === 0 ? (
                            <p className="admin-chart-card__empty">No referrer data yet</p>
                        ) : (
                            <div className="admin-breakdown-list">
                                {Object.entries(stats.byReferrer)
                                    .sort((a, b) => b[1].sessions - a[1].sessions)
                                    .slice(0, 10)
                                    .map(([domain, data]) => {
                                        const maxVal = Math.max(...Object.values(stats.byReferrer).map(d => d.sessions), 1);
                                        return (
                                            <div key={domain} className="admin-breakdown-item">
                                                <div className="admin-breakdown-item__header">
                                                    <span className="admin-breakdown-item__name admin-breakdown-item__name--mono">{domain}</span>
                                                    <span className="admin-breakdown-item__value">{data.sessions} sessions</span>
                                                </div>
                                                <div className="admin-breakdown-item__bar-bg">
                                                    <div
                                                        className="admin-breakdown-item__bar"
                                                        style={{ width: `${(data.sessions / maxVal) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    <div className="admin-chart-card">
                        <h3 className="admin-chart-card__title">Traffic by Medium</h3>
                        <div className="admin-breakdown-list">
                            {Object.entries(stats.byMedium)
                                .sort((a, b) => b[1].sessions - a[1].sessions)
                                .map(([medium, data]) => {
                                    const maxVal = Math.max(...Object.values(stats.byMedium).map(d => d.sessions), 1);
                                    const colors = {
                                        direct: 'var(--admin-primary)',
                                        organic: 'var(--admin-success)',
                                        social: '#06B6D4',
                                        referral: 'var(--admin-warning)',
                                        paid: 'var(--admin-danger)',
                                        email: '#EC4899',
                                    };
                                    const color = colors[medium] || 'var(--admin-primary)';
                                    return (
                                        <div key={medium} className="admin-breakdown-item">
                                            <div className="admin-breakdown-item__header">
                                                <span className="admin-breakdown-item__name">
                                                    <span className="admin-breakdown-item__dot" style={{ background: color }} />
                                                    {medium}
                                                </span>
                                                <span className="admin-breakdown-item__value">{data.sessions} sessions</span>
                                            </div>
                                            <div className="admin-breakdown-item__bar-bg">
                                                <div
                                                    className="admin-breakdown-item__bar"
                                                    style={{ width: `${(data.sessions / maxVal) * 100}%`, background: color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

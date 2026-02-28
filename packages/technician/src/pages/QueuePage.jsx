import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_TYPES } from '@shared/constants';
import { supabase } from '@shared/supabase';
import TechNav from '../components/TechNav';

export default function QueuePage() {
    const [filter, setFilter] = useState('all');
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [fetchError, setFetchError] = useState(null);
    const location = useLocation();
    const [paymentComplete, setPaymentComplete] = useState(
        () => location.state?.paymentComplete === true
    );

    // Fetch repairs from Supabase
    useEffect(() => {
        const fetchRepairs = async () => {
            setLoading(true);
            setFetchError(null);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Technicians see: their assigned repairs + all unassigned pending repairs
            // Exclude completed and cancelled repairs from queue
            const { data, error } = await supabase
                .from('repairs')
                .select(`
                    id,
                    device,
                    issues,
                    parts_tier,
                    service_fee,
                    total_estimate,
                    schedule_date,
                    schedule_time,
                    address,
                    status,
                    notes,
                    created_at,
                    technician_id,
                    customer_id,
                    customers (full_name, phone, email)
                `)
                .or(`technician_id.eq.${user.id},and(technician_id.is.null,status.eq.pending)`)
                .neq('status', 'complete')
                .neq('status', 'cancelled')
                .order('schedule_date', { ascending: true });

            if (error) {
                setFetchError(error.message);
                setLoading(false);
                return;
            }
            if (data) {
                setRepairs(data);

                // Fetch unread message counts (only messages newer than last read)
                if (data.length > 0) {
                    const repairIds = data.map(r => r.id);

                    // Get last-read timestamps for this tech
                    const { data: readRows } = await supabase
                        .from('chat_last_read')
                        .select('repair_id, last_read_at')
                        .eq('user_id', user.id)
                        .in('repair_id', repairIds);

                    const lastReadMap = {};
                    (readRows || []).forEach(r => { lastReadMap[r.repair_id] = r.last_read_at; });

                    // Get all customer messages for these repairs
                    const { data: msgs } = await supabase
                        .from('messages')
                        .select('repair_id, created_at')
                        .in('repair_id', repairIds)
                        .eq('sender_role', 'customer');

                    if (msgs) {
                        const counts = {};
                        msgs.forEach(m => {
                            const lastRead = lastReadMap[m.repair_id];
                            if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
                                counts[m.repair_id] = (counts[m.repair_id] || 0) + 1;
                            }
                        });
                        setUnreadCounts(counts);
                    }
                }
            }
            setLoading(false);
        };

        fetchRepairs();

        // Subscribe to realtime changes on repairs table
        const repairsChannel = supabase
            .channel('repairs-queue')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'repairs',
            }, () => {
                // Re-fetch on any change
                fetchRepairs();
            })
            .subscribe();

        // Listen for new customer messages to update badge counts
        const messagesChannel = supabase
            .channel('queue-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                if (payload.new.sender_role === 'customer') {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [payload.new.repair_id]: (prev[payload.new.repair_id] || 0) + 1,
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(repairsChannel);
            supabase.removeChannel(messagesChannel);
        };
    }, []);

    const todayStr = new Date().toLocaleDateString('en-CA');
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA');

    const { filteredRepairs, dateGroups } = useMemo(() => {
        const sorted = [...repairs].sort((a, b) => {
            if (!a.schedule_date && !b.schedule_date) return 0;
            if (!a.schedule_date) return 1;
            if (!b.schedule_date) return -1;
            return new Date(a.schedule_date) - new Date(b.schedule_date);
        });

        const filtered = filter === 'all'
            ? sorted
            : sorted.filter((r) => r.status === filter);

        const grouped = filtered.reduce((groups, repair) => {
            const key = repair.schedule_date || 'unscheduled';
            if (!groups[key]) groups[key] = [];
            groups[key].push(repair);
            return groups;
        }, {});

        const groups = Object.entries(grouped).map(([key, items]) => {
            let label;
            if (key === 'unscheduled') label = 'Unscheduled';
            else if (key === todayStr) label = 'Today';
            else if (key === tomorrowStr) label = 'Tomorrow';
            else label = new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return { key, label, repairs: items };
        });

        return { filteredRepairs: filtered, dateGroups: groups };
    }, [repairs, filter, todayStr, tomorrowStr]);

    return (
        <>
            <TechNav />

            {/* Payment Complete Banner */}
            {paymentComplete && (
                <div className="payment-complete-banner">
                    <span className="payment-complete-banner__icon">✅</span>
                    <span className="payment-complete-banner__text">Payment complete! Repair has been marked as done.</span>
                    <button className="payment-complete-banner__close" onClick={() => setPaymentComplete(false)}>×</button>
                </div>
            )}

            {/* Queue Content */}
            <div className="queue-page">
                <div className="guru-container">
                    <div className="queue-header">
                        <div>
                            <h1 className="queue-header__title">Repair Queue</h1>
                            <p className="queue-header__count">
                                {loading ? 'Loading...' : `${filteredRepairs.length} repairs available`}
                            </p>
                        </div>
                    </div>

                    <div className="queue-filters">
                        {[
                            { key: 'all', label: 'All' },
                            { key: REPAIR_STATUS.PENDING, label: 'Pending' },
                            { key: REPAIR_STATUS.CONFIRMED, label: 'Confirmed' },
                            { key: REPAIR_STATUS.EN_ROUTE, label: 'En Route' },
                            { key: REPAIR_STATUS.IN_PROGRESS, label: 'In Progress' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                className={`queue-filter ${filter === f.key ? 'queue-filter--active' : ''}`}
                                onClick={() => setFilter(f.key)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="queue-list stagger-children">
                        {loading ? (
                            <div className="tech-loading-state">
                                <div className="tech-loading-state__icon">⏳</div>
                                <div className="tech-loading-state__text">Loading repairs...</div>
                            </div>
                        ) : fetchError ? (
                            <div className="tech-empty-state">
                                <div className="tech-empty-state__icon">⚠️</div>
                                <div className="tech-empty-state__text">Failed to load repairs: {fetchError}</div>
                            </div>
                        ) : filteredRepairs.length === 0 ? (
                            <div className="tech-empty-state">
                                <div className="tech-empty-state__icon">📋</div>
                                <div className="tech-empty-state__text">No repairs in this category</div>
                            </div>
                        ) : dateGroups.map(({ key, label, repairs: groupRepairs }) => (
                            <div key={key} className="queue-date-group">
                                <div className={`queue-date-header ${key === todayStr ? 'queue-date-header--today' : key === tomorrowStr ? 'queue-date-header--tomorrow' : ''}`}>
                                    <span className="queue-date-header__label">{label}</span>
                                    <span className="queue-date-header__count">{groupRepairs.length}</span>
                                    <span className="queue-date-header__line" />
                                </div>
                                {groupRepairs.map((repair) => {
                                    const customerName = repair.customers?.full_name || 'Unknown Customer';
                                    const issues = Array.isArray(repair.issues) ? repair.issues : [];
                                    const issueLabels = issues.map(id => {
                                        const type = REPAIR_TYPES.find(t => t.id === id);
                                        return type ? `${type.icon} ${type.name}` : id;
                                    });
                                    return (
                                        <Link to={`/repair/${repair.id}`} key={repair.id} className="repair-card animate-fade-in-up" style={{ position: 'relative' }}>
                                            {unreadCounts[repair.id] > 0 && (
                                                <span className="msg-notify-badge">
                                                    💬 {unreadCounts[repair.id]}
                                                </span>
                                            )}
                                            <div className={`repair-card__priority repair-card__priority--${repair.status}`}></div>
                                            <div className="repair-card__info">
                                                <div className="repair-card__device">{repair.device}</div>
                                                <div className="repair-card__issues">{issueLabels.join(' · ')}</div>
                                                <div className="repair-card__meta">
                                                    <span>👤 {customerName}</span>
                                                    <span>🕐 {repair.schedule_time || '—'}</span>
                                                </div>
                                            </div>
                                            <div className="repair-card__actions">
                                                <div className="repair-card__price">${repair.total_estimate}</div>
                                                <span className={`guru-badge ${repair.status === REPAIR_STATUS.PENDING ? 'guru-badge--warning' :
                                                    repair.status === REPAIR_STATUS.COMPLETE ? 'guru-badge--success' :
                                                        'guru-badge--purple'
                                                    }`}>
                                                    {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

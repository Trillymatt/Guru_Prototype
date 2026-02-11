import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS } from '@shared/constants';
import { supabase } from '@shared/supabase';
import TechNav from '../components/TechNav';

export default function QueuePage() {
    const [filter, setFilter] = useState('all');
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch repairs from Supabase
    useEffect(() => {
        const fetchRepairs = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Technicians see: their assigned repairs + all unassigned pending repairs
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
                .order('schedule_date', { ascending: true });

            if (!error && data) {
                setRepairs(data);
            }
            setLoading(false);
        };

        fetchRepairs();

        // Subscribe to realtime changes on repairs table
        const channel = supabase
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

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredRepairs = filter === 'all'
        ? repairs
        : repairs.filter((r) => r.status === filter);

    // Derive priority from schedule proximity
    const getPriority = (repair) => {
        const daysUntil = Math.ceil((new Date(repair.schedule_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 1) return 'high';
        if (daysUntil <= 3) return 'medium';
        return 'low';
    };

    return (
        <>
            <TechNav />

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
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#737373' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                                Loading repairs...
                            </div>
                        ) : filteredRepairs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#737373' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
                                No repairs in this category
                            </div>
                        ) : filteredRepairs.map((repair) => {
                            const priority = getPriority(repair);
                            const customerName = repair.customers?.full_name || 'Unknown Customer';
                            const issues = Array.isArray(repair.issues) ? repair.issues : [];
                            return (
                                <Link to={`/repair/${repair.id}`} key={repair.id} className="repair-card animate-fade-in-up" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div className={`repair-card__priority repair-card__priority--${priority}`}></div>
                                    <div className="repair-card__info">
                                        <div className="repair-card__device">{repair.device}</div>
                                        <div className="repair-card__issues">{issues.join(' · ')}</div>
                                        <div className="repair-card__meta">
                                            <span>👤 {customerName}</span>
                                            <span>📅 {repair.schedule_date}</span>
                                            <span>🕐 {repair.schedule_time}</span>
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
                </div>
            </div>
        </>
    );
}

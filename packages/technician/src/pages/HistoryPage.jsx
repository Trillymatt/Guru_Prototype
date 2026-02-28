import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_TYPES } from '@shared/constants';
import { supabase } from '@shared/supabase';
import TechNav from '../components/TechNav';

export default function HistoryPage() {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('repairs')
                .select(`
                    id,
                    device,
                    issues,
                    parts_tier,
                    total_estimate,
                    schedule_date,
                    schedule_time,
                    status,
                    created_at,
                    updated_at,
                    customers (full_name)
                `)
                .eq('technician_id', user.id)
                .eq('status', 'complete')
                .order('updated_at', { ascending: false });

            if (error) {
                setFetchError(error.message);
                setLoading(false);
                return;
            }
            if (data) {
                setRepairs(data);
            }
            setLoading(false);
        };

        fetchHistory();
    }, []);

    return (
        <>
            <TechNav />

            <div className="queue-page">
                <div className="guru-container">
                    <div className="queue-header">
                        <div>
                            <h1 className="queue-header__title">Repair History</h1>
                            <p className="queue-header__count">
                                {loading ? 'Loading...' : `${repairs.length} completed repairs`}
                            </p>
                        </div>
                    </div>

                    <div className="queue-list stagger-children">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                                Loading history...
                            </div>
                        ) : fetchError ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                                Failed to load history: {fetchError}
                            </div>
                        ) : repairs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
                                No completed repairs yet.
                                <br />
                                <Link to="/queue" style={{ color: 'var(--guru-purple-600)', marginTop: 12, display: 'inline-block' }}>
                                    ← Back to Queue
                                </Link>
                            </div>
                        ) : repairs.map((repair) => {
                            const customerName = repair.customers?.full_name || 'Unknown Customer';
                            const issues = Array.isArray(repair.issues) ? repair.issues : [];
                            const completedDate = repair.updated_at
                                ? new Date(repair.updated_at).toLocaleDateString('en-US', {
                                    month: '2-digit', day: '2-digit', year: 'numeric'
                                })
                                : '—';

                            return (
                                <Link
                                    to={`/repair/${repair.id}`}
                                    key={repair.id}
                                    className="repair-card animate-fade-in-up"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className="repair-card__priority" style={{ background: 'var(--guru-success)' }}></div>
                                    <div className="repair-card__info">
                                        <div className="repair-card__device">{repair.device}</div>
                                        <div className="repair-card__issues">{issues.map(id => {
                                            const type = REPAIR_TYPES.find(t => t.id === id);
                                            return type ? `${type.icon} ${type.name}` : id;
                                        }).join(' · ')}</div>
                                        <div className="repair-card__meta">
                                            <span>👤 {customerName}</span>
                                            <span>✅ Completed {completedDate}</span>
                                        </div>
                                    </div>
                                    <div className="repair-card__actions">
                                        <div className="repair-card__price">${repair.total_estimate}</div>
                                        <span className="guru-badge guru-badge--success">
                                            {REPAIR_STATUS_LABELS[repair.status]}
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

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import { REPAIR_TYPES } from '@shared/constants';

export default function DashboardPage() {
    const { user } = useAuth();
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        if (!user) return;

        async function fetchData() {
            const [{ data: profile }, { data: repairData }] = await Promise.all([
                supabase.from('customers').select('*').eq('id', user.id).single(),
                supabase.from('repairs').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }),
            ]);
            setCustomer(profile);
            setRepairs(repairData || []);
            setLoading(false);
        }

        fetchData();
    }, [user]);

    const getStatusBadge = (status) => {
        const map = {
            pending: { label: 'Pending', className: 'dash-badge--pending' },
            confirmed: { label: 'Confirmed', className: 'dash-badge--confirmed' },
            in_progress: { label: 'In Progress', className: 'dash-badge--progress' },
            completed: { label: 'Completed', className: 'dash-badge--completed' },
            cancelled: { label: 'Cancelled', className: 'dash-badge--cancelled' },
        };
        const info = map[status] || { label: status, className: '' };
        return <span className={`dash-badge ${info.className}`}>{info.label}</span>;
    };

    const getIssueName = (issueId) => {
        const type = REPAIR_TYPES.find(t => t.id === issueId);
        return type ? `${type.icon} ${type.name}` : issueId;
    };

    return (
        <>
            <Navbar />
            <div className="dashboard">
                <div className="guru-container guru-container--narrow">
                    <div className="dash-header">
                        <div>
                            <h1 className="dash-title">
                                Welcome back{customer?.full_name ? `, ${customer.full_name}` : ''}
                            </h1>
                            <p className="dash-subtitle">Here are your repair bookings.</p>
                        </div>
                        <Link to="/repair" className="guru-btn guru-btn--primary">
                            New Repair
                        </Link>
                    </div>

                    {loading ? (
                        <div className="dash-loading">Loading your repairs...</div>
                    ) : repairs.length === 0 ? (
                        <div className="dash-empty">
                            <div className="dash-empty__icon">📱</div>
                            <h2>No repairs yet</h2>
                            <p>Book your first repair and it will show up here.</p>
                            <Link to="/repair" className="guru-btn guru-btn--primary" style={{ marginTop: 16 }}>
                                Start a Repair
                            </Link>
                        </div>
                    ) : (
                        <div className="dash-repairs">
                            {repairs.map((repair) => (
                                <div key={repair.id} className="dash-card">
                                    <div className="dash-card__header">
                                        <span className="dash-card__device">{repair.device}</span>
                                        {getStatusBadge(repair.status)}
                                    </div>
                                    <div className="dash-card__details">
                                        <div className="dash-card__row">
                                            <span>Issues</span>
                                            <span>
                                                {Array.isArray(repair.issues)
                                                    ? repair.issues.map(id => getIssueName(id)).join(', ')
                                                    : '—'}
                                            </span>
                                        </div>
                                        <div className="dash-card__row">
                                            <span>Date</span>
                                            <span>{repair.schedule_date || '—'}</span>
                                        </div>
                                        <div className="dash-card__row">
                                            <span>Time</span>
                                            <span>{repair.schedule_time || '—'}</span>
                                        </div>
                                        <div className="dash-card__row">
                                            <span>Address</span>
                                            <span>{repair.address || '—'}</span>
                                        </div>
                                        <div className="dash-card__row dash-card__row--total">
                                            <span>Estimated Total</span>
                                            <span>${repair.total_estimate}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

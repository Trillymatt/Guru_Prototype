import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '../supabaseAdmin';

const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    parts_ordered: 'Parts Ordered',
    parts_received: 'Parts Received',
    scheduled: 'Scheduled',
    en_route: 'En Route',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    complete: 'Complete',
    cancelled: 'Cancelled',
};

const STATUS_COLORS = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    parts_ordered: '#8B5CF6',
    parts_received: '#6366F1',
    scheduled: '#06B6D4',
    en_route: '#F97316',
    arrived: '#10B981',
    in_progress: '#7C3AED',
    complete: '#22C55E',
    cancelled: '#EF4444',
};

export default function CustomerDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomerData();
    }, [id]);

    async function fetchCustomerData() {
        if (!supabaseAdmin) { setLoading(false); return; }
        setLoading(true);

        const [custResult, repairResult] = await Promise.all([
            supabaseAdmin.from('customers').select('*').eq('id', id).single(),
            supabaseAdmin.from('repairs').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        ]);

        setCustomer(custResult.data);
        setRepairs(repairResult.data || []);
        setLoading(false);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatCurrency(amount) {
        if (amount == null) return '—';
        return `$${parseFloat(amount).toFixed(2)}`;
    }

    function getRepairTypeName(job) {
        if (!Array.isArray(job.issues) || job.issues.length === 0) return '—';
        const issue = job.issues[0];
        return typeof issue === 'string' ? issue : issue?.name || issue?.id || '—';
    }

    function getDeviceHistory() {
        const devices = {};
        repairs.forEach(r => {
            if (r.device) {
                if (!devices[r.device]) devices[r.device] = 0;
                devices[r.device]++;
            }
        });
        return Object.entries(devices).sort((a, b) => b[1] - a[1]);
    }

    const totalSpent = repairs.reduce((sum, r) => sum + (parseFloat(r.price_charged || r.total_estimate) || 0), 0);
    const completedJobs = repairs.filter(r => r.status === 'complete').length;
    const activeJobs = repairs.filter(r => r.status !== 'complete' && r.status !== 'cancelled').length;

    if (loading) return <div className="admin-page"><div className="admin-loading">Loading customer...</div></div>;
    if (!customer) return <div className="admin-page"><div className="admin-empty">Customer not found</div></div>;

    return (
        <div className="admin-page">
            <button onClick={() => navigate('/customers')} className="admin-back-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                Back to Customers
            </button>

            {/* Customer Header */}
            <div className="admin-detail-header">
                <div className="admin-detail-header__info">
                    <div className="admin-detail-header__avatar">
                        {(customer.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="admin-page__title">{customer.full_name || 'Unknown'}</h1>
                        <div className="admin-detail-header__meta">
                            {customer.phone && <span>{customer.phone}</span>}
                            {customer.email && <span>{customer.email}</span>}
                            <span>Joined {formatDate(customer.created_at)}</span>
                        </div>
                    </div>
                </div>
                {customer.guru_plus_subscriber && (
                    <span className="admin-badge admin-badge--guru-plus">Guru Plus</span>
                )}
            </div>

            {/* Stats */}
            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{repairs.length}</span>
                    <span className="admin-stat-card__label">Total Jobs</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{completedJobs}</span>
                    <span className="admin-stat-card__label">Completed</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{activeJobs}</span>
                    <span className="admin-stat-card__label">Active</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatCurrency(totalSpent)}</span>
                    <span className="admin-stat-card__label">Total Spent</span>
                </div>
            </div>

            {/* Device History */}
            {getDeviceHistory().length > 0 && (
                <div className="admin-section">
                    <h2 className="admin-section__title">Device History</h2>
                    <div className="admin-device-chips">
                        {getDeviceHistory().map(([device, count]) => (
                            <span key={device} className="admin-device-chip">
                                {device} <span className="admin-device-chip__count">x{count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Repair History */}
            <div className="admin-section">
                <h2 className="admin-section__title">Repair History</h2>
                {repairs.length === 0 ? (
                    <p className="admin-empty">No repairs found</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Device</th>
                                    <th>Repair</th>
                                    <th>Status</th>
                                    <th>Price</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repairs.map(repair => (
                                    <tr key={repair.id}>
                                        <td>{formatDate(repair.created_at)}</td>
                                        <td>{repair.device || '—'}</td>
                                        <td>{getRepairTypeName(repair)}</td>
                                        <td>
                                            <span
                                                className="admin-status-badge"
                                                style={{ backgroundColor: STATUS_COLORS[repair.status] + '22', color: STATUS_COLORS[repair.status], borderColor: STATUS_COLORS[repair.status] }}
                                            >
                                                {STATUS_LABELS[repair.status] || repair.status}
                                            </span>
                                        </td>
                                        <td>{formatCurrency(repair.price_charged || repair.total_estimate)}</td>
                                        <td className="admin-table__notes">{repair.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

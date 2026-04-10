import React, { useEffect, useMemo, useState } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';

const ATTEMPT_FILTERS = ['all', 'rejected', 'accepted'];

export default function ReferralsPage() {
    const [summary, setSummary] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [attemptFilter, setAttemptFilter] = useState('all');

    useEffect(() => {
        fetchReferralMonitoring();
    }, []);

    async function fetchReferralMonitoring() {
        setLoading(true);
        if (!supabaseAdmin) {
            setLoading(false);
            return;
        }

        const [summaryRes, referralsRes, attemptsRes] = await Promise.all([
            supabaseAdmin
                .from('admin_referral_summary')
                .select('*')
                .limit(1)
                .maybeSingle(),
            supabaseAdmin
                .from('admin_referral_details')
                .select('*')
                .order('referred_at', { ascending: false })
                .limit(150),
            supabaseAdmin
                .from('admin_referral_attempts')
                .select('*')
                .order('attempted_at', { ascending: false })
                .limit(300),
        ]);

        if (!summaryRes.error) setSummary(summaryRes.data || null);
        if (!referralsRes.error) setReferrals(referralsRes.data || []);
        if (!attemptsRes.error) setAttempts(attemptsRes.data || []);
        setLoading(false);
    }

    const filteredAttempts = useMemo(() => {
        if (attemptFilter === 'all') return attempts;
        return attempts.filter((attempt) => attempt.outcome === attemptFilter);
    }, [attempts, attemptFilter]);

    const rejectedCount = useMemo(
        () => attempts.filter((attempt) => attempt.outcome === 'rejected').length,
        [attempts]
    );

    const rejectionBreakdown = useMemo(() => {
        const counts = {};
        attempts
            .filter((attempt) => attempt.outcome === 'rejected')
            .forEach((attempt) => {
                const reason = attempt.rejection_reason || 'unknown';
                counts[reason] = (counts[reason] || 0) + 1;
            });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [attempts]);

    function formatCurrency(value) {
        return `$${Number(value || 0).toFixed(2)}`;
    }

    function formatDateTime(value) {
        if (!value) return '—';
        return new Date(value).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    }

    if (loading) {
        return <div className="admin-page"><div className="admin-loading">Loading referral monitoring...</div></div>;
    }

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Referrals</h1>
                    <p className="admin-page__subtitle">Track successful referrals and blocked abuse attempts</p>
                </div>
                <button className="admin-btn admin-btn--ghost" onClick={fetchReferralMonitoring}>
                    Refresh
                </button>
            </div>

            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{summary?.total_successful_referrals || 0}</span>
                    <span className="admin-stat-card__label">Successful Referrals</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatCurrency(summary?.total_discount_granted || 0)}</span>
                    <span className="admin-stat-card__label">Total Discount Granted</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{summary?.successful_last_30_days || 0}</span>
                    <span className="admin-stat-card__label">Successful (30 days)</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{rejectedCount}</span>
                    <span className="admin-stat-card__label">Blocked Attempts</span>
                </div>
            </div>

            <div className="admin-charts-grid">
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Blocked Attempt Reasons</h3>
                    {rejectionBreakdown.length === 0 ? (
                        <p className="admin-chart-card__empty">No blocked attempts yet</p>
                    ) : (
                        <div className="admin-breakdown-list">
                            {rejectionBreakdown.map(([reason, count]) => {
                                const maxCount = Math.max(...rejectionBreakdown.map((entry) => entry[1]), 1);
                                return (
                                    <div key={reason} className="admin-breakdown-item">
                                        <div className="admin-breakdown-item__header">
                                            <span className="admin-breakdown-item__name admin-breakdown-item__name--mono">{reason}</span>
                                            <span className="admin-breakdown-item__value">{count}</span>
                                        </div>
                                        <div className="admin-breakdown-item__bar-bg">
                                            <div
                                                className="admin-breakdown-item__bar admin-breakdown-item__bar--danger"
                                                style={{ width: `${(count / maxCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-page__header" style={{ marginTop: 28 }}>
                <div>
                    <h2 className="admin-page__title" style={{ fontSize: 20 }}>Recent Referral Attempts</h2>
                </div>
                <div className="admin-filters__tabs" style={{ maxWidth: 340 }}>
                    {ATTEMPT_FILTERS.map((filter) => (
                        <button
                            key={filter}
                            className={`admin-filters__tab ${attemptFilter === filter ? 'admin-filters__tab--active' : ''}`}
                            onClick={() => setAttemptFilter(filter)}
                        >
                            {filter === 'all' ? 'All' : filter === 'rejected' ? 'Blocked' : 'Accepted'}
                        </button>
                    ))}
                </div>
            </div>

            {filteredAttempts.length === 0 ? (
                <div className="admin-empty">No referral attempts found</div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Attempted By</th>
                                <th>Code</th>
                                <th>Matched Referrer</th>
                                <th>Outcome</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttempts.map((attempt) => (
                                <tr key={attempt.attempt_id}>
                                    <td>{formatDateTime(attempt.attempted_at)}</td>
                                    <td>
                                        <div className="admin-table__customer">
                                            <span className="admin-table__name">{attempt.attempted_by_name || 'Unknown'}</span>
                                            <span className="admin-table__phone">{attempt.attempted_by_email || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="admin-breakdown-item__name--mono">{attempt.attempted_referral_code || '—'}</td>
                                    <td>
                                        <div className="admin-table__customer">
                                            <span className="admin-table__name">{attempt.matched_referrer_name || '—'}</span>
                                            <span className="admin-table__phone">{attempt.matched_referrer_email || '—'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-outcome-badge admin-outcome-badge--${attempt.outcome}`}>
                                            {attempt.outcome}
                                        </span>
                                    </td>
                                    <td className="admin-breakdown-item__name--mono">{attempt.rejection_reason || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="admin-page__header" style={{ marginTop: 28 }}>
                <div>
                    <h2 className="admin-page__title" style={{ fontSize: 20 }}>Successful Referrals</h2>
                </div>
            </div>

            {referrals.length === 0 ? (
                <div className="admin-empty">No successful referrals yet</div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Referred At</th>
                                <th>Referrer</th>
                                <th>Friend</th>
                                <th>Code</th>
                                <th>Discount</th>
                                <th>Repair Status</th>
                                <th>Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referrals.map((referral) => (
                                <tr key={referral.referral_id}>
                                    <td>{formatDateTime(referral.referred_at)}</td>
                                    <td>
                                        <div className="admin-table__customer">
                                            <span className="admin-table__name">{referral.referrer_name || 'Unknown'}</span>
                                            <span className="admin-table__phone">{referral.referrer_email || '—'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-table__customer">
                                            <span className="admin-table__name">{referral.referred_name || 'Unknown'}</span>
                                            <span className="admin-table__phone">{referral.referred_email || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="admin-breakdown-item__name--mono">{referral.referral_code}</td>
                                    <td>{formatCurrency(referral.discount_amount)}</td>
                                    <td>{referral.repair_status || '—'}</td>
                                    <td>{referral.payment_status || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

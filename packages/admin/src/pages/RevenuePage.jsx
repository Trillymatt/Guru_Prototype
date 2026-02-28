import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';

const REPAIR_TYPE_NAMES = {
    screen: 'Screen Replacement',
    battery: 'Battery Replacement',
    'back-glass': 'Back Glass',
    'camera-rear': 'Rear Camera',
    'camera-front': 'Front Camera',
};

const TIER_NAMES = {
    economy: 'Economy',
    premium: 'Premium',
    genuine: 'Genuine Apple',
};

const TIER_COLORS = {
    economy: '#22C55E',
    premium: '#7C3AED',
    genuine: '#F59E0B',
};

export default function RevenuePage() {
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRepairs();
    }, []);

    async function fetchRepairs() {
        if (!supabaseAdmin) { setLoading(false); return; }
        setLoading(true);
        const { data } = await supabaseAdmin
            .from('repairs')
            .select('id, status, issues, parts_tier, price_charged, total_estimate, created_at')
            .order('created_at', { ascending: false });
        setRepairs(data || []);
        setLoading(false);
    }

    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        const completedRepairs = repairs.filter(r => r.status === 'complete');

        // Total revenue
        const totalRevenue = completedRepairs.reduce((sum, r) =>
            sum + (parseFloat(r.price_charged || r.total_estimate) || 0), 0
        );

        // This month's completed jobs and revenue
        const thisMonthJobs = completedRepairs.filter(r =>
            new Date(r.created_at) >= thisMonth
        );
        const thisMonthRevenue = thisMonthJobs.reduce((sum, r) =>
            sum + (parseFloat(r.price_charged || r.total_estimate) || 0), 0
        );

        // Last month's completed jobs and revenue
        const lastMonthJobs = completedRepairs.filter(r => {
            const d = new Date(r.created_at);
            return d >= lastMonth && d <= lastMonthEnd;
        });
        const lastMonthRevenue = lastMonthJobs.reduce((sum, r) =>
            sum + (parseFloat(r.price_charged || r.total_estimate) || 0), 0
        );

        // Revenue by repair type
        const byRepairType = {};
        completedRepairs.forEach(r => {
            let typeId = 'unknown';
            if (Array.isArray(r.issues) && r.issues.length > 0) {
                const issue = r.issues[0];
                typeId = typeof issue === 'string' ? issue : issue?.id || 'unknown';
            }
            const amount = parseFloat(r.price_charged || r.total_estimate) || 0;
            if (!byRepairType[typeId]) byRepairType[typeId] = { revenue: 0, count: 0 };
            byRepairType[typeId].revenue += amount;
            byRepairType[typeId].count++;
        });

        // Revenue by tier
        const byTier = {};
        completedRepairs.forEach(r => {
            let tierId = 'unknown';
            if (r.parts_tier) {
                tierId = typeof r.parts_tier === 'object' ? r.parts_tier.id || 'unknown' : r.parts_tier;
            }
            const amount = parseFloat(r.price_charged || r.total_estimate) || 0;
            if (!byTier[tierId]) byTier[tierId] = { revenue: 0, count: 0 };
            byTier[tierId].revenue += amount;
            byTier[tierId].count++;
        });

        // Monthly revenue trend (last 6 months)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const monthJobs = completedRepairs.filter(r => {
                const d = new Date(r.created_at);
                return d >= start && d <= end;
            });
            const rev = monthJobs.reduce((sum, r) =>
                sum + (parseFloat(r.price_charged || r.total_estimate) || 0), 0
            );
            monthlyTrend.push({
                label: start.toLocaleDateString('en-US', { month: 'short' }),
                revenue: rev,
                count: monthJobs.length,
            });
        }

        return {
            totalRevenue,
            totalJobs: completedRepairs.length,
            thisMonthRevenue,
            thisMonthJobs: thisMonthJobs.length,
            lastMonthRevenue,
            lastMonthJobs: lastMonthJobs.length,
            byRepairType,
            byTier,
            monthlyTrend,
        };
    }, [repairs]);

    function formatCurrency(amount) {
        return `$${amount.toFixed(2)}`;
    }

    function getMaxBarValue(data) {
        return Math.max(...data.map(d => d.revenue), 1);
    }

    if (loading) return <div className="admin-page"><div className="admin-loading">Loading revenue data...</div></div>;

    const monthChange = stats.lastMonthRevenue > 0
        ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100).toFixed(1)
        : stats.thisMonthRevenue > 0 ? '100' : '0';

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Revenue</h1>
                    <p className="admin-page__subtitle">Financial overview</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatCurrency(stats.totalRevenue)}</span>
                    <span className="admin-stat-card__label">Total Revenue</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{stats.totalJobs}</span>
                    <span className="admin-stat-card__label">Jobs Completed</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatCurrency(stats.thisMonthRevenue)}</span>
                    <span className="admin-stat-card__label">This Month</span>
                    <span className={`admin-stat-card__change ${parseFloat(monthChange) >= 0 ? 'admin-stat-card__change--up' : 'admin-stat-card__change--down'}`}>
                        {parseFloat(monthChange) >= 0 ? '+' : ''}{monthChange}%
                    </span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-card__value">{formatCurrency(stats.lastMonthRevenue)}</span>
                    <span className="admin-stat-card__label">Last Month</span>
                </div>
            </div>

            {/* Jobs comparison */}
            <div className="admin-stats-row">
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">{stats.thisMonthJobs}</span>
                    <span className="admin-stat-card__label">Jobs This Month</span>
                </div>
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">{stats.lastMonthJobs}</span>
                    <span className="admin-stat-card__label">Jobs Last Month</span>
                </div>
                <div className="admin-stat-card admin-stat-card--small">
                    <span className="admin-stat-card__value">
                        {stats.totalJobs > 0 ? formatCurrency(stats.totalRevenue / stats.totalJobs) : '$0.00'}
                    </span>
                    <span className="admin-stat-card__label">Avg. Job Value</span>
                </div>
            </div>

            <div className="admin-charts-grid">
                {/* Monthly Trend Chart */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Monthly Revenue (Last 6 Months)</h3>
                    <div className="admin-bar-chart">
                        {stats.monthlyTrend.map((month, i) => (
                            <div key={i} className="admin-bar-chart__col">
                                <div className="admin-bar-chart__bar-wrap">
                                    <div
                                        className="admin-bar-chart__bar"
                                        style={{
                                            height: `${(month.revenue / getMaxBarValue(stats.monthlyTrend)) * 100}%`,
                                        }}
                                    >
                                        <span className="admin-bar-chart__value">
                                            ${Math.round(month.revenue)}
                                        </span>
                                    </div>
                                </div>
                                <span className="admin-bar-chart__label">{month.label}</span>
                                <span className="admin-bar-chart__count">{month.count} jobs</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Revenue by Repair Type */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Revenue by Repair Type</h3>
                    <div className="admin-breakdown-list">
                        {Object.entries(stats.byRepairType)
                            .sort((a, b) => b[1].revenue - a[1].revenue)
                            .map(([typeId, data]) => {
                                const maxRev = Math.max(...Object.values(stats.byRepairType).map(d => d.revenue), 1);
                                return (
                                    <div key={typeId} className="admin-breakdown-item">
                                        <div className="admin-breakdown-item__header">
                                            <span className="admin-breakdown-item__name">
                                                {REPAIR_TYPE_NAMES[typeId] || typeId}
                                            </span>
                                            <span className="admin-breakdown-item__value">
                                                {formatCurrency(data.revenue)} ({data.count} jobs)
                                            </span>
                                        </div>
                                        <div className="admin-breakdown-item__bar-bg">
                                            <div
                                                className="admin-breakdown-item__bar"
                                                style={{ width: `${(data.revenue / maxRev) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Revenue by Tier */}
                <div className="admin-chart-card">
                    <h3 className="admin-chart-card__title">Revenue by Service Tier</h3>
                    <div className="admin-breakdown-list">
                        {Object.entries(stats.byTier)
                            .sort((a, b) => b[1].revenue - a[1].revenue)
                            .map(([tierId, data]) => {
                                const maxRev = Math.max(...Object.values(stats.byTier).map(d => d.revenue), 1);
                                return (
                                    <div key={tierId} className="admin-breakdown-item">
                                        <div className="admin-breakdown-item__header">
                                            <span className="admin-breakdown-item__name">
                                                <span
                                                    className="admin-breakdown-item__dot"
                                                    style={{ backgroundColor: TIER_COLORS[tierId] || '#666' }}
                                                />
                                                {TIER_NAMES[tierId] || tierId}
                                            </span>
                                            <span className="admin-breakdown-item__value">
                                                {formatCurrency(data.revenue)} ({data.count} jobs)
                                            </span>
                                        </div>
                                        <div className="admin-breakdown-item__bar-bg">
                                            <div
                                                className="admin-breakdown-item__bar"
                                                style={{
                                                    width: `${(data.revenue / maxRev) * 100}%`,
                                                    backgroundColor: TIER_COLORS[tierId] || '#7C3AED',
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
}

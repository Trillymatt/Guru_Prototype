import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import { REPAIR_TYPES, REPAIR_STATUS_LABELS } from '@shared/constants';

export default function DashboardPage() {
    const { user } = useAuth();
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'
    const [unreadCounts, setUnreadCounts] = useState({}); // { repairId: count }

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

            // Fetch unread message counts (only messages newer than last read)
            if (repairData && repairData.length > 0) {
                const repairIds = repairData.map(r => r.id);

                // Get last-read timestamps for this user
                const { data: readRows } = await supabase
                    .from('chat_last_read')
                    .select('repair_id, last_read_at')
                    .eq('user_id', user.id)
                    .in('repair_id', repairIds);

                const lastReadMap = {};
                (readRows || []).forEach(r => { lastReadMap[r.repair_id] = r.last_read_at; });

                // Get all technician messages for these repairs
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('repair_id, created_at')
                    .in('repair_id', repairIds)
                    .eq('sender_role', 'technician');

                if (msgs) {
                    const counts = {};
                    msgs.forEach(m => {
                        const lastRead = lastReadMap[m.repair_id];
                        // Only count if no last_read or message is newer
                        if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
                            counts[m.repair_id] = (counts[m.repair_id] || 0) + 1;
                        }
                    });
                    setUnreadCounts(counts);
                }
            }
        }

        fetchData();

        // Listen for new messages in real time to update badge counts
        const channel = supabase
            .channel('dashboard-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, (payload) => {
                if (payload.new.sender_role === 'technician') {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [payload.new.repair_id]: (prev[payload.new.repair_id] || 0) + 1,
                    }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    const activeRepairs = repairs.filter(r => r.status !== 'complete' && r.status !== 'cancelled');
    const completedRepairs = repairs.filter(r => r.status === 'complete' || r.status === 'cancelled');

    const getStatusBadge = (status) => {
        const classMap = {
            pending: 'dash-badge--pending',
            confirmed: 'dash-badge--confirmed',
            parts_ordered: 'dash-badge--pending',
            parts_received: 'dash-badge--confirmed',
            scheduled: 'dash-badge--confirmed',
            en_route: 'dash-badge--progress',
            arrived: 'dash-badge--progress',
            in_progress: 'dash-badge--progress',
            complete: 'dash-badge--completed',
            cancelled: 'dash-badge--cancelled',
        };
        const label = REPAIR_STATUS_LABELS[status] || status;
        const className = classMap[status] || '';
        return <span className={`dash-badge ${className}`}>{label}</span>;
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

                    {/* Tab Navigation */}
                    <div className="dash-tabs" style={{ marginBottom: 24 }}>
                        <button
                            className={`dash-tab ${activeTab === 'active' ? 'dash-tab--active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Active Repairs ({activeRepairs.length})
                        </button>
                        <button
                            className={`dash-tab ${activeTab === 'history' ? 'dash-tab--active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History ({completedRepairs.length})
                        </button>
                    </div>

                    {loading ? (
                        <div className="dash-loading">Loading your repairs...</div>
                    ) : activeTab === 'active' ? (
                        activeRepairs.length === 0 ? (
                            <div className="dash-empty">
                                <div className="dash-empty__icon">📱</div>
                                <h2>No active repairs</h2>
                                <p>Book a repair and it will show up here.</p>
                                <Link to="/repair" className="guru-btn guru-btn--primary" style={{ marginTop: 16 }}>
                                    Start a Repair
                                </Link>
                            </div>
                        ) : (
                            <div className="dash-repairs">
                                {activeRepairs.map((repair) => (
                                    <Link key={repair.id} to={`/repair/${repair.id}`} className="dash-card dash-card--clickable" style={{ position: 'relative' }}>
                                        {unreadCounts[repair.id] > 0 && (
                                            <span className="msg-notify-badge">
                                                💬 {unreadCounts[repair.id]}
                                            </span>
                                        )}
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
                                                <span>{repair.schedule_date ? repair.schedule_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : '—'}</span>
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
                                        <div className="dash-card__footer">
                                            <span className="dash-card__view-link">View Details →</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )
                    ) : (
                        completedRepairs.length === 0 ? (
                            <div className="dash-empty">
                                <div className="dash-empty__icon">✅</div>
                                <h2>No completed repairs</h2>
                                <p>Your repair history will appear here once repairs are completed.</p>
                            </div>
                        ) : (
                            <div className="dash-repairs">
                                {completedRepairs.map((repair) => (
                                    <Link key={repair.id} to={`/repair/${repair.id}`} className="dash-card dash-card--clickable">
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
                                                <span>Completed</span>
                                                <span>
                                                    {repair.updated_at 
                                                        ? new Date(repair.updated_at).toLocaleDateString('en-US', {
                                                            month: '2-digit', day: '2-digit', year: 'numeric'
                                                        })
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="dash-card__row dash-card__row--total">
                                                <span>Total</span>
                                                <span>${repair.total_estimate}</span>
                                            </div>
                                        </div>
                                        <div className="dash-card__footer">
                                            <span className="dash-card__view-link">View Details →</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
}

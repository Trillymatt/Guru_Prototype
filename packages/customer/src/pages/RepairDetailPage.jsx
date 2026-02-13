import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import RepairChat from '@shared/RepairChat';
import {
    REPAIR_TYPES,
    REPAIR_STATUS,
    REPAIR_STATUS_LABELS,
    REPAIR_STATUS_FLOW,
    PARTS_TIERS,
    SERVICE_FEE,
    SAMPLE_PRICING,
    TAX_RATE,
} from '@shared/constants';
import '@shared/repair-chat.css';
import '../styles/repair-detail.css';

const TIME_SLOT_LABELS = {
    morning: { label: 'Morning', range: '8:00 AM – 12:00 PM' },
    afternoon: { label: 'Afternoon', range: '12:00 PM – 4:00 PM' },
    evening: { label: 'Evening', range: '4:00 PM – 7:00 PM' },
};

// Simulated technician location that moves toward the customer
function useSimulatedTechLocation(repair) {
    const [techLocation, setTechLocation] = useState(null);
    const [eta, setEta] = useState(null);

    useEffect(() => {
        if (repair?.status !== REPAIR_STATUS.EN_ROUTE) {
            setTechLocation(null);
            setEta(null);
            return;
        }

        // Simulate tech starting ~3-5 miles away and approaching
        const customerLat = 32.7767;
        const customerLng = -96.7970;
        const startOffset = 0.04 + Math.random() * 0.02; // ~3-5 miles
        const angle = Math.random() * Math.PI * 2;

        let progress = 0;
        const startLat = customerLat + Math.cos(angle) * startOffset;
        const startLng = customerLng + Math.sin(angle) * startOffset;

        const interval = setInterval(() => {
            progress = Math.min(progress + 0.02 + Math.random() * 0.01, 0.95);
            const lat = startLat + (customerLat - startLat) * progress;
            const lng = startLng + (customerLng - startLng) * progress;
            const remaining = Math.max(1, Math.round((1 - progress) * 25));

            setTechLocation({ lat, lng });
            setEta(remaining);
        }, 3000);

        // Initial position
        setTechLocation({ lat: startLat, lng: startLng });
        setEta(Math.round(25 + Math.random() * 10));

        return () => clearInterval(interval);
    }, [repair?.status]);

    return { techLocation, eta };
}

export default function RepairDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [customerName, setCustomerName] = useState('');

    const { techLocation, eta } = useSimulatedTechLocation(repair);

    // Fetch the customer's display name for chat
    useEffect(() => {
        if (!user) return;
        supabase
            .from('customers')
            .select('full_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.full_name) setCustomerName(data.full_name);
            });
    }, [user]);

    useEffect(() => {
        if (!user || !id) return;

        async function fetchRepair() {
            const { data } = await supabase
                .from('repairs')
                .select('*')
                .eq('id', id)
                .eq('customer_id', user.id)
                .single();
            setRepair(data);
            setLoading(false);
        }

        fetchRepair();

        // Realtime subscription for live status updates
        const channel = supabase
            .channel(`repair-${id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'repairs', filter: `id=eq.${id}` },
                (payload) => {
                    // Update the entire repair object with new data
                    setRepair(prev => ({ ...prev, ...payload.new }));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, id]);

    const getIssueName = (issueId) => {
        const type = REPAIR_TYPES.find(t => t.id === issueId);
        return type ? `${type.icon} ${type.name}` : issueId;
    };

    const getIssuePrice = (issueId) => {
        const tier = repair?.parts_tier?.[issueId] || 'premium';
        return SAMPLE_PRICING[issueId]?.[tier] || 0;
    };

    const handleEditToggle = () => {
        if (!isEditing) {
            // Entering edit mode - populate with current values
            setEditDate(repair.schedule_date || '');
            setEditTime(repair.schedule_time || '');
            setEditAddress(repair.address || '');
            setSaveError('');
        }
        setIsEditing(!isEditing);
    };

    const handleSaveChanges = async () => {
        if (!editDate || !editTime || !editAddress) {
            setSaveError('Please fill in all fields');
            return;
        }

        setIsSaving(true);
        setSaveError('');

        const { error } = await supabase
            .from('repairs')
            .update({
                schedule_date: editDate,
                schedule_time: editTime,
                address: editAddress,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            setSaveError('Failed to save changes. Please try again.');
            setIsSaving(false);
            return;
        }

        // Update local state
        setRepair(prev => ({
            ...prev,
            schedule_date: editDate,
            schedule_time: editTime,
            address: editAddress,
        }));
        setIsEditing(false);
        setIsSaving(false);
    };

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const minDateStr = minDate.toISOString().split('T')[0];

    const timeSlots = [
        { id: 'morning', label: 'Morning', range: '8:00 AM – 12:00 PM', icon: '🌅' },
        { id: 'afternoon', label: 'Afternoon', range: '12:00 PM – 4:00 PM', icon: '☀️' },
        { id: 'evening', label: 'Evening', range: '4:00 PM – 7:00 PM', icon: '🌆' },
    ];

    const currentStepIndex = repair ? REPAIR_STATUS_FLOW.indexOf(repair.status) : 0;

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="repair-detail">
                    <div className="guru-container guru-container--narrow">
                        <div className="rd-loading">Loading repair details...</div>
                    </div>
                </div>
            </>
        );
    }

    if (!repair) {
        return (
            <>
                <Navbar />
                <div className="repair-detail">
                    <div className="guru-container guru-container--narrow">
                        <div className="rd-empty">
                            <h2>Repair not found</h2>
                            <p>This repair doesn't exist or you don't have access to it.</p>
                            <Link to="/dashboard" className="guru-btn guru-btn--primary" style={{ marginTop: 16 }}>
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const isEnRoute = repair.status === REPAIR_STATUS.EN_ROUTE;
    const isArrived = repair.status === REPAIR_STATUS.ARRIVED;

    return (
        <>
            <Navbar />
            <div className="repair-detail">
                <div className="guru-container guru-container--narrow">
                    <Link to="/dashboard" className="rd-back">← Back to My Repairs</Link>

                    <div className="rd-header">
                        <div>
                            <h1 className="rd-title">{repair.device}</h1>
                            <p className="rd-subtitle">
                                Booked on {new Date(repair.created_at).toLocaleDateString('en-US', {
                                    month: '2-digit', day: '2-digit', year: 'numeric'
                                })}
                            </p>
                        </div>
                        <span className={`dash-badge dash-badge--lg ${getStatusClass(repair.status)}`}>
                            {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                        </span>
                    </div>

                    {/* Status Progress Stepper */}
                    <div className="rd-stepper">
                        <h3 className="rd-section-title">Repair Progress</h3>
                        <div className="rd-stepper__track">
                            {REPAIR_STATUS_FLOW.map((status, i) => {
                                const isComplete = i < currentStepIndex || (i === currentStepIndex && repair.status === 'complete');
                                const isCurrent = i === currentStepIndex && repair.status !== 'complete';
                                return (
                                    <div
                                        key={status}
                                        className={`rd-step ${isComplete ? 'rd-step--complete' : ''} ${isCurrent ? 'rd-step--current' : ''}`}
                                    >
                                        <div className="rd-step__dot">
                                            {isComplete ? '✓' : i + 1}
                                        </div>
                                        <span className="rd-step__label">
                                            {REPAIR_STATUS_LABELS[status]}
                                        </span>
                                        {i < REPAIR_STATUS_FLOW.length - 1 && (
                                            <div className={`rd-step__line ${isComplete ? 'rd-step__line--filled' : ''}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chat with Technician */}
                    <RepairChat
                        repairId={id}
                        userId={user.id}
                        senderRole="customer"
                        senderName={customerName}
                    />

                    {/* En Route Map Section */}
                    {(isEnRoute || isArrived) && (
                        <div className="rd-map-section">
                            <h3 className="rd-section-title">
                                {isEnRoute ? 'Technician En Route' : 'Technician Has Arrived'}
                            </h3>
                            {isEnRoute && eta && (
                                <div className="rd-eta-banner">
                                    <div className="rd-eta-banner__icon">🚗</div>
                                    <div className="rd-eta-banner__text">
                                        <span className="rd-eta-banner__label">Estimated arrival</span>
                                        <span className="rd-eta-banner__time">{eta} min</span>
                                    </div>
                                    <div className="rd-eta-banner__pulse"></div>
                                </div>
                            )}
                            {isArrived && (
                                <div className="rd-eta-banner rd-eta-banner--arrived">
                                    <div className="rd-eta-banner__icon">📍</div>
                                    <div className="rd-eta-banner__text">
                                        <span className="rd-eta-banner__label">Your technician is here</span>
                                        <span className="rd-eta-banner__time">Arrived</span>
                                    </div>
                                </div>
                            )}
                            <div className="rd-map">
                                <div className="rd-map__container">
                                    {/* Simulated map with grid and markers */}
                                    <div className="rd-map__grid">
                                        {/* Road lines */}
                                        <div className="rd-map__road rd-map__road--h1"></div>
                                        <div className="rd-map__road rd-map__road--h2"></div>
                                        <div className="rd-map__road rd-map__road--h3"></div>
                                        <div className="rd-map__road rd-map__road--v1"></div>
                                        <div className="rd-map__road rd-map__road--v2"></div>
                                        <div className="rd-map__road rd-map__road--v3"></div>
                                    </div>

                                    {/* Customer pin - center */}
                                    <div className="rd-map__pin rd-map__pin--customer" style={{ left: '50%', top: '50%' }}>
                                        <div className="rd-map__pin-icon">🏠</div>
                                        <div className="rd-map__pin-label">You</div>
                                        <div className="rd-map__pin-ring"></div>
                                    </div>

                                    {/* Technician pin - animated position */}
                                    {isEnRoute && techLocation && (
                                        <div
                                            className="rd-map__pin rd-map__pin--tech"
                                            style={{
                                                left: `${20 + (eta ? (1 - eta / 35) * 30 : 0)}%`,
                                                top: `${25 + (eta ? (1 - eta / 35) * 25 : 0)}%`,
                                                transition: 'left 2s ease, top 2s ease',
                                            }}
                                        >
                                            <div className="rd-map__pin-icon">🚗</div>
                                            <div className="rd-map__pin-label">Tech</div>
                                            <div className="rd-map__pin-pulse"></div>
                                        </div>
                                    )}

                                    {isArrived && (
                                        <div className="rd-map__pin rd-map__pin--tech" style={{ left: '48%', top: '48%' }}>
                                            <div className="rd-map__pin-icon">🔧</div>
                                            <div className="rd-map__pin-label">Tech</div>
                                        </div>
                                    )}

                                    {/* Dashed route line */}
                                    {isEnRoute && (
                                        <svg className="rd-map__route" viewBox="0 0 400 300" preserveAspectRatio="none">
                                            <path
                                                d={`M ${80 + (eta ? (1 - eta / 35) * 120 : 0)} ${75 + (eta ? (1 - eta / 35) * 75 : 0)} Q 160 180 200 150`}
                                                stroke="var(--guru-purple-500)"
                                                strokeWidth="3"
                                                strokeDasharray="8 6"
                                                fill="none"
                                                opacity="0.7"
                                            />
                                        </svg>
                                    )}

                                    <div className="rd-map__watermark">Live Tracking</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Repair Details */}
                    <div className="rd-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 className="rd-section-title" style={{ margin: 0 }}>Repair Details</h3>
                            {!isEditing && repair.status === 'pending' && (
                                <button
                                    className="guru-btn guru-btn--ghost guru-btn--sm"
                                    onClick={handleEditToggle}
                                >
                                    ✏️ Edit
                                </button>
                            )}
                        </div>
                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        className="guru-input"
                                        min={minDateStr}
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                                        Time Slot
                                    </label>
                                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        {timeSlots.map((slot) => (
                                            <button
                                                key={slot.id}
                                                className={`sched-slot ${editTime === slot.id ? 'sched-slot--selected' : ''}`}
                                                onClick={() => setEditTime(slot.id)}
                                                style={{ flex: '1 1 auto', minWidth: 150 }}
                                            >
                                                <span className="sched-slot__icon">{slot.icon}</span>
                                                <span className="sched-slot__label">{slot.label}</span>
                                                <span className="sched-slot__range">{slot.range}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                                        Address
                                    </label>
                                    <input
                                        type="text"
                                        className="guru-input"
                                        value={editAddress}
                                        onChange={(e) => setEditAddress(e.target.value)}
                                        placeholder="Enter your address"
                                    />
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                                        We come to your home, office, or wherever you are.
                                    </p>
                                </div>
                                {saveError && (
                                    <div style={{ padding: 12, background: 'var(--guru-error-bg)', color: 'var(--guru-error)', borderRadius: 8, fontSize: '0.875rem' }}>
                                        {saveError}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button
                                        className="guru-btn guru-btn--ghost"
                                        onClick={handleEditToggle}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="guru-btn guru-btn--primary"
                                        onClick={handleSaveChanges}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rd-details">
                                <div className="rd-detail-row">
                                    <span className="rd-detail-label">Device</span>
                                    <span className="rd-detail-value">{repair.device}</span>
                                </div>
                                <div className="rd-detail-row">
                                    <span className="rd-detail-label">Issues</span>
                                    <span className="rd-detail-value">
                                        {Array.isArray(repair.issues)
                                            ? repair.issues.map(id => getIssueName(id)).join(', ')
                                            : '—'}
                                    </span>
                                </div>
                                <div className="rd-detail-row">
                                    <span className="rd-detail-label">Date</span>
                                    <span className="rd-detail-value">{repair.schedule_date ? repair.schedule_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : '—'}</span>
                                </div>
                                <div className="rd-detail-row">
                                    <span className="rd-detail-label">Time</span>
                                    <span className="rd-detail-value">
                                        {TIME_SLOT_LABELS[repair.schedule_time]?.range || repair.schedule_time || '—'}
                                    </span>
                                </div>
                                <div className="rd-detail-row">
                                    <span className="rd-detail-label">Address</span>
                                    <span className="rd-detail-value">{repair.address || '—'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="rd-card">
                        <h3 className="rd-section-title">Pricing Breakdown</h3>
                        <div className="rd-pricing">
                            {Array.isArray(repair.issues) && repair.issues.map((issueId) => {
                                const type = REPAIR_TYPES.find(t => t.id === issueId);
                                const tierKey = repair.parts_tier?.[issueId] || 'premium';
                                const tier = PARTS_TIERS.find(t => t.id === tierKey);
                                const price = getIssuePrice(issueId);
                                return (
                                    <div key={issueId} className="rd-price-row">
                                        <div className="rd-price-row__left">
                                            <span>{type?.icon} {type?.name}</span>
                                            <span className="rd-price-tier">{tier?.name}</span>
                                        </div>
                                        <span className="rd-price-row__amount">${price}</span>
                                    </div>
                                );
                            })}
                            <div className="rd-price-row">
                                <span>🚗 On-site Service Fee</span>
                                <span className="rd-price-row__amount">${SERVICE_FEE}</span>
                            </div>
                            <div className="rd-price-row rd-price-row--total">
                                <span>Estimated Total</span>
                                <span className="rd-price-row__amount">${repair.total_estimate}</span>
                            </div>
                        </div>
                    </div>

                    {repair.notes && (
                        <div className="rd-card">
                            <h3 className="rd-section-title">Notes</h3>
                            <p className="rd-notes">{repair.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function getStatusClass(status) {
    const map = {
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
    return map[status] || '';
}

import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import RepairChat from '@shared/RepairChat';
import { useTechLocationWatch } from '@shared/useTechLocationWatch';
import { geocodeAddress } from '@shared/geocode';
import LiveTrackingMap from '@shared/LiveTrackingMap';
import {
    REPAIR_TYPES,
    REPAIR_STATUS,
    REPAIR_STATUS_LABELS,
    REPAIR_STATUS_FLOW,
    PARTS_TIERS,
    SERVICE_FEE,
    SAMPLE_PRICING,
    TAX_RATE,
    getRepairStatusFlow,
} from '@shared/constants';
import GuruCalendar from '@shared/GuruCalendar';
import 'leaflet/dist/leaflet.css';
import '@shared/guru-calendar.css';
import '@shared/repair-chat.css';
import '@shared/live-tracking.css';
import '../styles/repair-detail.css';

const TIME_SLOT_LABELS = {
    morning: { label: 'Morning', range: '8:00 AM – 12:00 PM' },
    afternoon: { label: 'Afternoon', range: '12:00 PM – 4:00 PM' },
    evening: { label: 'Evening', range: '4:00 PM – 7:00 PM' },
};

export default function RepairDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerLocation, setCustomerLocation] = useState(null);

    // Track whether map should be active (en_route or arrived)
    const isTrackingActive = repair?.status === REPAIR_STATUS.EN_ROUTE || repair?.status === REPAIR_STATUS.ARRIVED;

    // Watch technician's live location via Supabase Realtime
    const { techLocation, distance, eta, lastUpdated } = useTechLocationWatch({
        repairId: id,
        isActive: isTrackingActive,
        customerLocation,
    });

    // Geocode the repair address to get customer lat/lng for the map
    useEffect(() => {
        if (!repair?.address) return;
        let cancelled = false;
        geocodeAddress(repair.address)
            .then((coords) => {
                if (!cancelled && coords) {
                    setCustomerLocation(coords);
                }
            })
            .catch((err) => {
                console.error('Geocoding failed for address:', err.message);
            });
        return () => { cancelled = true; };
    }, [repair?.address]);

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

    const handleCancelRepair = async () => {
        setShowCancelModal(false);
        const { error } = await supabase
            .from('repairs')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (!error) {
            setRepair(prev => ({ ...prev, status: 'cancelled' }));
        }
    };

    const canCancel = repair && ![
        REPAIR_STATUS.EN_ROUTE,
        REPAIR_STATUS.ARRIVED,
        REPAIR_STATUS.IN_PROGRESS,
        REPAIR_STATUS.COMPLETE,
        REPAIR_STATUS.CANCELLED,
    ].includes(repair.status);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const minDateStr = minDate.toISOString().split('T')[0];

    const timeSlots = [
        { id: 'morning', label: 'Morning', range: '8:00 AM – 12:00 PM', icon: '🌅' },
        { id: 'afternoon', label: 'Afternoon', range: '12:00 PM – 4:00 PM', icon: '☀️' },
        { id: 'evening', label: 'Evening', range: '4:00 PM – 7:00 PM', icon: '🌆' },
    ];

    // Use conditional status flow based on whether parts were in stock
    const statusFlow = repair ? getRepairStatusFlow(repair.parts_in_stock) : REPAIR_STATUS_FLOW;
    const currentStepIndex = repair ? statusFlow.indexOf(repair.status) : 0;

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

                    {/* Inventory status banner */}
                    {repair.parts_in_stock === true && (
                        <div className="rd-inventory-banner rd-inventory-banner--in-stock">
                            <span>✓</span> All parts were in stock for this repair.
                        </div>
                    )}
                    {repair.parts_in_stock === false && (
                        <div className="rd-inventory-banner rd-inventory-banner--order">
                            <span>📦</span> Parts are being ordered for this repair.
                        </div>
                    )}

                    {/* Status Progress Stepper */}
                    <div className="rd-stepper">
                        <h3 className="rd-section-title">Repair Progress</h3>
                        <div className="rd-stepper__track">
                            {statusFlow.map((status, i) => {
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
                                        {i < statusFlow.length - 1 && (
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

                    {/* Live Tracking Map Section */}
                    {(isEnRoute || isArrived) && (
                        <div className="rd-map-section">
                            <h3 className="rd-section-title">
                                {isEnRoute ? 'Technician En Route' : 'Technician Has Arrived'}
                            </h3>

                            {/* ETA Banner */}
                            {isEnRoute && (
                                <div className="lt-eta">
                                    <div className="lt-eta__icon">🚗</div>
                                    <div className="lt-eta__text">
                                        <span className="lt-eta__label">Estimated arrival</span>
                                        {eta ? (
                                            <span className="lt-eta__time">{eta} min</span>
                                        ) : (
                                            <span className="lt-eta__time">Calculating...</span>
                                        )}
                                        {distance !== null && (
                                            <span className="lt-eta__detail">{distance} miles away</span>
                                        )}
                                    </div>
                                    <div className="lt-eta__pulse"></div>
                                </div>
                            )}
                            {isArrived && (
                                <div className="lt-eta lt-eta--arrived">
                                    <div className="lt-eta__icon">📍</div>
                                    <div className="lt-eta__text">
                                        <span className="lt-eta__label">Your technician is here</span>
                                        <span className="lt-eta__time">Arrived</span>
                                    </div>
                                    <div className="lt-eta__pulse"></div>
                                </div>
                            )}

                            {/* Live Leaflet Map */}
                            <LiveTrackingMap
                                customerLocation={customerLocation}
                                techLocation={techLocation}
                                eta={eta}
                                distance={distance}
                                isArrived={isArrived}
                                customerAddress={repair.address}
                            />

                            {lastUpdated && (
                                <div className="lt-eta__updated">
                                    Last updated: {lastUpdated.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true,
                                    })}
                                </div>
                            )}
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
                                    <GuruCalendar
                                        value={editDate}
                                        onChange={setEditDate}
                                        minDate={minDateStr}
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

                    {/* Invoice Link — shown once payment is complete */}
                    {repair.payment_status === 'completed' && (
                        <div className="rd-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                            <div>
                                <h3 className="rd-section-title" style={{ margin: 0, marginBottom: 4 }}>Invoice</h3>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--guru-gray-500)', margin: 0 }}>
                                    Your repair has been paid. View or print your invoice below.
                                </p>
                            </div>
                            <Link
                                to={`/invoice/${id}`}
                                className="guru-btn guru-btn--primary"
                                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                            >
                                View Invoice
                            </Link>
                        </div>
                    )}

                    {repair.notes && (
                        <div className="rd-card">
                            <h3 className="rd-section-title">Notes</h3>
                            <p className="rd-notes">{repair.notes}</p>
                        </div>
                    )}

                    {canCancel && (
                        <div className="rd-cancel-section">
                            <button
                                className="guru-btn guru-btn--danger"
                                onClick={() => setShowCancelModal(true)}
                            >
                                Cancel Repair
                            </button>
                            <p className="rd-cancel-note">
                                Cancellation is not available once a technician is en route.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showCancelModal && (
                <div className="rd-modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="rd-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rd-modal__icon">⚠️</div>
                        <h3 className="rd-modal__title">Cancel This Repair?</h3>
                        <p className="rd-modal__message">
                            Are you sure you want to cancel? Your repair request will be removed and you will need to rebook if you change your mind.
                        </p>
                        <div className="rd-modal__actions">
                            <button className="guru-btn guru-btn--ghost" onClick={() => setShowCancelModal(false)}>
                                Keep Repair
                            </button>
                            <button className="guru-btn guru-btn--danger" onClick={handleCancelRepair}>
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

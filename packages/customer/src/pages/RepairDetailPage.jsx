import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
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

    const { techLocation, eta } = useSimulatedTechLocation(repair);

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
                    setRepair(payload.new);
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
                                    month: 'long', day: 'numeric', year: 'numeric'
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
                                const isComplete = i < currentStepIndex;
                                const isCurrent = i === currentStepIndex;
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
                        <h3 className="rd-section-title">Repair Details</h3>
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
                                <span className="rd-detail-value">{repair.schedule_date || '—'}</span>
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

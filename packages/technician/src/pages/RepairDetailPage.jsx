import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW, REPAIR_TYPES, PARTS_TIERS, SAMPLE_PRICING, getPartsUrl, getDeviceRepairPrice, SERVICE_FEE, LABOR_FEE, TAX_RATE, getRepairStatusFlow, TIME_SLOTS } from '@shared/constants';
import { supabase } from '@shared/supabase';
import { useLocationBroadcast } from '@shared/useLocationBroadcast';
import RepairChat from '@shared/RepairChat';
import usePaymentFlow from '../hooks/usePaymentFlow';
import useRepairPhotos from '../hooks/useRepairPhotos';
import TechNav from '../components/TechNav';
import '@shared/repair-chat.css';
import '@shared/live-tracking.css';
import '../styles/tech-repair-detail.css';

const AGREEMENT_TEXT = `GURU MOBILE REPAIR AGREEMENT

By signing below, I authorize SEER Mobile Repair Solutions ("SEER") to perform the repair service(s) described in this work order on my device.

I acknowledge that:
1. I am the rightful owner of the device submitted for repair.
2. I understand the estimated cost and repair details as presented.
3. SEER is not responsible for pre-existing conditions or damage unrelated to the requested repair.
4. Data backup is my responsibility. SEER is not liable for any data loss during repair.
5. The selected parts tier and associated quality level have been explained to me.
6. Repair times are estimates and may vary based on device condition.

I agree to these terms and authorize the repair to proceed.`;

export default function RepairDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    // Intake signature (captured when tech arrives, before repair starts)
    const [showIntakeSignature, setShowIntakeSignature] = useState(false);
    const [intakeSigned, setIntakeSigned] = useState(false);
    // Completion signature (captured after payment, inside the payment modal)
    const [completionSigned, setCompletionSigned] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [techName, setTechName] = useState('');
    const canvasRef = useRef(null);
    const sigPadRef = useRef(null);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState(null); // { nextStatus, nextLabel, isClaim }
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Photo state (delegated to useRepairPhotos hook)
    const {
        photos, beforePhotos, afterPhotos,
        photosLoading, uploading, photoError,
        uploadPhoto, deletePhoto,
    } = useRepairPhotos(id, supabase);
    const [photoType, setPhotoType] = useState('before');
    const [expandedPhoto, setExpandedPhoto] = useState(null);
    const fileInputRef = useRef(null);

    // Payment state (delegated to usePaymentFlow reducer)
    const {
        payment,
        showModal: openPaymentModal,
        hideModal: closePaymentModal,
        setTip,
        setMethod,
        setStep: setPaymentStep,
        startProcessing,
        stopProcessing,
        setError: setPaymentError,
        setPeerConfirmed,
        setCashReceived,
        setSplitCash,
        backToTip,
        backToMethod,
    } = usePaymentFlow();

    // Location sharing state
    const [locationModal, setLocationModal] = useState(false);
    const isEnRoute = repair?.status === REPAIR_STATUS.EN_ROUTE;

    const {
        isSharing: isLocationSharing,
        error: locationError,
        position: techPosition,

        requestPermission: requestLocationPermission,
        stopSharing: stopLocationSharing,
    } = useLocationBroadcast({
        repairId: id,
        technicianId: currentUserId,
        isActive: isEnRoute && !locationModal,
    });

    // Get current user id + name for chat
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setCurrentUserId(user.id);
                supabase
                    .from('technicians')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()
                    .then(({ data }) => {
                        if (data?.full_name) setTechName(data.full_name);
                    });
            }
        });
    }, []);

    // Fetch repair from Supabase
    useEffect(() => {
        const fetchRepair = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from('repairs')
                .select(`
                    *,
                    customers (full_name, phone, email)
                `)
                .eq('id', id)
                .single();

            if (error || !data) {
                setLoading(false);
                return;
            }

            setRepair(data);
            setIntakeSigned(!!data.signature_path);
            setCompletionSigned(!!data.completion_signature_path);
            setLoading(false);
        };

        fetchRepair();

        // Subscribe to realtime changes for this specific repair
        const channel = supabase
            .channel(`repair-${id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'repairs',
                filter: `id=eq.${id}`,
            }, (payload) => {
                setRepair(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    // Initialize signature pad — shared canvas for intake and completion signatures
    useEffect(() => {
        const needsSig = showIntakeSignature || (payment.showModal && payment.step === 'signature');
        if (!needsSig) {
            sigPadRef.current = null;
            return;
        }
        if (canvasRef.current && !sigPadRef.current) {
            import('signature_pad').then(({ default: SignaturePad }) => {
                if (!canvasRef.current) return;
                sigPadRef.current = new SignaturePad(canvasRef.current, {
                    backgroundColor: 'rgb(255, 255, 255)',
                    penColor: 'rgb(10, 10, 10)',
                });
                const canvas = canvasRef.current;
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = canvas.offsetWidth * ratio;
                canvas.height = canvas.offsetHeight * ratio;
                canvas.getContext('2d').scale(ratio, ratio);
            });
        }
    }, [showIntakeSignature, payment.showModal, payment.step]);


    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadPhoto(file, photoType);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePhotoDelete = async (photo) => {
        const deletedId = await deletePhoto(photo);
        if (deletedId && expandedPhoto?.id === deletedId) setExpandedPhoto(null);
    };

    const clearSignature = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
        }
    };

    const saveIntakeSignature = async () => {
        if (!sigPadRef.current || sigPadRef.current.isEmpty()) return;
        const signatureData = sigPadRef.current.toDataURL();
        try {
            const blob = await (await fetch(signatureData)).blob();
            const fileName = `signatures/${id}_intake_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('repair-photos')
                .upload(fileName, blob, { contentType: 'image/png' });
            if (!uploadError) {
                await supabase
                    .from('repairs')
                    .update({ signature_path: fileName, updated_at: new Date().toISOString() })
                    .eq('id', id);
                setRepair(prev => ({ ...prev, signature_path: fileName }));
            }
        } catch (err) {
            // signature storage is non-critical
        }
        setIntakeSigned(true);
        setShowIntakeSignature(false);
    };

    const saveCompletionSignature = async () => {
        if (!sigPadRef.current || sigPadRef.current.isEmpty()) return;
        const signatureData = sigPadRef.current.toDataURL();
        try {
            const blob = await (await fetch(signatureData)).blob();
            const fileName = `signatures/${id}_completion_${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('repair-photos')
                .upload(fileName, blob, { contentType: 'image/png' });
            if (!uploadError) {
                await supabase
                    .from('repairs')
                    .update({ completion_signature_path: fileName, updated_at: new Date().toISOString() })
                    .eq('id', id);
                setRepair(prev => ({ ...prev, completion_signature_path: fileName }));
            }
        } catch (err) {
            // signature storage is non-critical
        }
        setCompletionSigned(true);
        await finalizeRepair();
    };

    // Called after payment + completion signature — marks the repair as complete
    const finalizeRepair = async () => {
        setUpdating(true);
        const updates = { status: REPAIR_STATUS.COMPLETE, updated_at: new Date().toISOString() };
        const { error } = await supabase.from('repairs').update(updates).eq('id', repair.id);
        if (!error) {
            setRepair(prev => ({ ...prev, ...updates }));
            // Send invoice email to customer
            const customerEmail = repair.customers?.email;
            if (customerEmail) {
                supabase.functions.invoke('send-repair-email', {
                    body: {
                        email_type: 'invoice_ready',
                        customer_email: customerEmail,
                        repair_id: repair.id,
                        customer_name: repair.customers?.full_name || 'Customer',
                        device: repair.device,
                        issues: repair.issues,
                        total_estimate: repair.total_estimate,
                        tip_amount: repair.tip_amount || payment.tipAmount,
                        payment_method: repair.payment_method,
                        paid_at: repair.paid_at || new Date().toISOString(),
                    },
                }).catch(() => {});
            }
        }
        setUpdating(false);
        closePaymentModal();
    };

    // Get the correct status flow for this repair
    const statusFlow = repair ? getRepairStatusFlow(repair.parts_in_stock) : REPAIR_STATUS_FLOW;

    // Open confirmation modal before advancing status
    const handleAdvanceClick = () => {
        if (!repair) return;
        const currentIndex = statusFlow.indexOf(repair.status);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= statusFlow.length) return;

        const nextStatus = statusFlow[nextIndex];

        // Completing a repair → trigger payment + signature flow instead of a simple confirm
        if (nextStatus === REPAIR_STATUS.COMPLETE) {
            openPaymentModal();
            return;
        }

        const nextLabel = REPAIR_STATUS_LABELS[nextStatus] || nextStatus;
        const isClaim = repair.status === REPAIR_STATUS.PENDING;
        setConfirmModal({ nextStatus, nextLabel, isClaim });
    };

    // Execute the status advance after confirmation
    const confirmAdvance = async () => {
        if (!confirmModal) return;
        const { nextStatus } = confirmModal;
        setConfirmModal(null);
        setUpdating(true);

        const { data: { user } } = await supabase.auth.getUser();
        const updates = { status: nextStatus, updated_at: new Date().toISOString() };

        if (repair.status === REPAIR_STATUS.PENDING && user) {
            updates.technician_id = user.id;
        }

        const { error } = await supabase
            .from('repairs')
            .update(updates)
            .eq('id', repair.id);

        if (!error) {
            setRepair(prev => ({ ...prev, ...updates }));

            // Auto-show intake signature when tech arrives
            if (nextStatus === REPAIR_STATUS.ARRIVED) {
                setShowIntakeSignature(true);
            }

            // Show location sharing prompt when moving to en_route
            if (nextStatus === REPAIR_STATUS.EN_ROUTE) {
                setLocationModal(true);
            }

            // Clean up location when moving past en_route
            if (repair.status === REPAIR_STATUS.EN_ROUTE && nextStatus !== REPAIR_STATUS.EN_ROUTE) {
                stopLocationSharing();
            }
        }

        setUpdating(false);
    };

    const handleCancelRepair = async () => {
        setShowCancelModal(false);
        setUpdating(true);
        const { error } = await supabase
            .from('repairs')
            .update({ status: REPAIR_STATUS.CANCELLED, updated_at: new Date().toISOString() })
            .eq('id', repair.id);
        if (!error) {
            setRepair(prev => ({ ...prev, status: REPAIR_STATUS.CANCELLED }));
        }
        setUpdating(false);
    };

    // ── Payment helpers ──────────────────────────────────────────────
    const computeTotal = () => {
        if (!repair) return { partsTotal: 0, subtotal: 0, tax: 0, grandTotal: 0 };
        const issues = Array.isArray(repair.issues) ? repair.issues : [];
        const partsTotal = issues.reduce((sum, issueId) => {
            const tierObj = typeof repair.parts_tier === 'object' ? repair.parts_tier : {};
            const tierId = tierObj[issueId] || 'premium';
            const price = getDeviceRepairPrice(repair.device, issueId, tierId) ?? SAMPLE_PRICING[issueId]?.[tierId] ?? 0;
            return sum + price;
        }, 0);
        const serviceFee = Number(repair.service_fee) || SERVICE_FEE;
        const laborFee = Number(repair.labor_fee) || LABOR_FEE;
        const subtotal = partsTotal + serviceFee + laborFee;
        const tax = subtotal * TAX_RATE;
        const grandTotal = subtotal + tax;
        return { partsTotal, serviceFee, laborFee, subtotal, tax, grandTotal };
    };


    const handleCashPayment = async () => {
        startProcessing();
        try {
            const { error } = await supabase
                .from('repairs')
                .update({
                    payment_method: 'cash',
                    payment_status: 'completed',
                    tip_amount: payment.tipAmount,
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', repair.id);

            if (error) throw error;
            setRepair(prev => ({
                ...prev,
                payment_method: 'cash',
                payment_status: 'completed',
                tip_amount: payment.tipAmount,
                paid_at: new Date().toISOString(),
            }));
            setPaymentStep('signature');
        } catch (err) {
            setPaymentError(err.message || 'Failed to record cash payment.');
        }
        stopProcessing();
    };

    // Peer-to-peer payment (Zelle, CashApp, Venmo): tech confirms payment received
    const handlePeerPayment = async () => {
        startProcessing();
        try {
            const { error } = await supabase
                .from('repairs')
                .update({
                    payment_method: payment.method,
                    payment_status: 'completed',
                    tip_amount: payment.tipAmount,
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', repair.id);

            if (error) throw error;
            setRepair(prev => ({
                ...prev,
                payment_method: payment.method,
                payment_status: 'completed',
                tip_amount: payment.tipAmount,
                paid_at: new Date().toISOString(),
            }));
            setPaymentStep('signature');
        } catch (err) {
            setPaymentError(err.message || 'Failed to record payment.');
        }
        stopProcessing();
    };


    if (loading) {
        return (
            <>
                <TechNav />
                <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                    Loading repair details...
                </div>
            </>
        );
    }

    if (!repair) {
        return (
            <>
                <TechNav />
                <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>❌</div>
                    Repair not found
                    <br />
                    <Link to="/queue" style={{ color: 'var(--guru-purple-600)', marginTop: 12, display: 'inline-block' }}>← Back to Queue</Link>
                </div>
            </>
        );
    }

    const currentStatusIndex = statusFlow.indexOf(repair.status);
    const customerName = repair.customers?.full_name || 'Unknown';
    const customerPhone = repair.customers?.phone || '—';
    const customerEmail = repair.customers?.email || '—';
    const issues = Array.isArray(repair.issues) ? repair.issues : [];

    const nextStatusLabel = repair.status !== REPAIR_STATUS.COMPLETE
        ? REPAIR_STATUS_LABELS[statusFlow[currentStatusIndex + 1]] || 'Done'
        : null;

    return (
        <>
            <TechNav />

            {/* ── Confirmation Modal ─────────────────────────────── */}
            {confirmModal && (
                <div className="confirm-modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal__icon">
                            {confirmModal.isClaim ? '🔧' : '✅'}
                        </div>
                        <h3 className="confirm-modal__title">
                            {confirmModal.isClaim ? 'Claim This Job?' : 'Advance Repair Status?'}
                        </h3>
                        <p className="confirm-modal__message">
                            {confirmModal.isClaim
                                ? `You are about to claim this repair and set it to "${confirmModal.nextLabel}". This will assign the job to you and notify the customer.`
                                : `You are about to mark this phase as complete and advance to:`
                            }
                        </p>
                        {!confirmModal.isClaim && (
                            <div className="confirm-modal__next-status">
                                {confirmModal.nextLabel}
                            </div>
                        )}
                        <p className="confirm-modal__warning">
                            This action will be visible to the customer. Make sure this phase is fully complete before continuing.
                        </p>
                        <div className="confirm-modal__actions">
                            <button
                                className="guru-btn guru-btn--ghost"
                                onClick={() => setConfirmModal(null)}
                            >
                                Go Back
                            </button>
                            <button
                                className="guru-btn guru-btn--primary"
                                onClick={confirmAdvance}
                            >
                                {confirmModal.isClaim ? 'Yes, Claim Job' : `Yes, Advance to "${confirmModal.nextLabel}"`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Cancel Repair Modal ────────────────────────────────── */}
            {showCancelModal && (
                <div className="confirm-modal-overlay" onClick={() => setShowCancelModal(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal__icon">⚠️</div>
                        <h3 className="confirm-modal__title">Cancel This Repair?</h3>
                        <p className="confirm-modal__message">
                            This will cancel the repair and notify the customer. This action cannot be undone.
                        </p>
                        <div className="confirm-modal__actions">
                            <button className="guru-btn guru-btn--ghost" onClick={() => setShowCancelModal(false)}>
                                Go Back
                            </button>
                            <button className="guru-btn guru-btn--danger" onClick={handleCancelRepair}>
                                Yes, Cancel Repair
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Location Permission Modal ──────────────────────────── */}
            {locationModal && (
                <div className="loc-modal-overlay" onClick={() => setLocationModal(false)}>
                    <div className="loc-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="loc-modal__icon">📍</div>
                        <h3 className="loc-modal__title">Share Your Location</h3>
                        <p className="loc-modal__message">
                            Share your live location so the customer can track your arrival in real time. This builds trust and helps them prepare for your visit.
                        </p>
                        <div className="loc-modal__actions">
                            <button
                                className="guru-btn guru-btn--primary"
                                onClick={() => {
                                    requestLocationPermission();
                                    setLocationModal(false);
                                }}
                            >
                                Share Location
                            </button>
                            <button
                                className="guru-btn guru-btn--ghost"
                                onClick={() => setLocationModal(false)}
                            >
                                Not Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="repair-detail">
                <div className="guru-container">

                    {/* ── Page Header ─────────────────────────────── */}
                    <div className="repair-detail__header">
                        <Link to="/queue" className="repair-detail__back">← Back to Queue</Link>
                        <span className={`guru-badge ${repair.status === REPAIR_STATUS.PENDING ? 'guru-badge--warning' :
                            repair.status === REPAIR_STATUS.COMPLETE ? 'guru-badge--success' :
                                'guru-badge--purple'
                            }`}>
                            {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                        </span>
                    </div>

                    {/* ════════════════════════════════════════════════
                        TOP — Repair Info + Status
                        ════════════════════════════════════════════════ */}
                    <div className="repair-detail__grid">

                        {/* LEFT: Repair Details */}
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Repair Details</h2>
                            <div className="repair-detail__info-stack">
                                <div>
                                    <span className="repair-detail__info-label">Device</span>
                                    <div className="repair-detail__info-value">{repair.device}</div>
                                </div>
                                <div>
                                    <span className="repair-detail__info-label">Repair Type</span>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                        {issues.map((issue) => {
                                            const type = REPAIR_TYPES.find((t) => t.id === issue);
                                            return (
                                                <span key={issue} className="guru-badge guru-badge--purple">
                                                    {type?.icon} {type?.name || issue}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                                {repair.notes && (
                                    <div>
                                        <span className="repair-detail__info-label">Notes</span>
                                        <div className="repair-detail__info-value--sm" style={{ marginTop: 4, lineHeight: 1.6 }}>{repair.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Repair Status Stepper + Next Button */}
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Repair Status</h2>

                            {repair.parts_in_stock === true && (
                                <div className="tech-inventory-badge tech-inventory-badge--in-stock">
                                    ✓ Parts in stock — no ordering needed
                                </div>
                            )}
                            {repair.parts_in_stock === false && (
                                <div className="tech-inventory-badge tech-inventory-badge--order">
                                    📦 Parts need to be ordered
                                </div>
                            )}

                            <div className="status-stepper">
                                {statusFlow.map((status, i) => {
                                    const isDone = i < currentStatusIndex;
                                    const isActive = i === currentStatusIndex;
                                    return (
                                        <div key={status} className={`status-step ${isDone ? 'status-step--done' : ''} ${isActive ? 'status-step--active' : ''}`}>
                                            <div className="status-step__dot"></div>
                                            <span className="status-step__label">{REPAIR_STATUS_LABELS[status]}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {repair.status !== REPAIR_STATUS.COMPLETE && (
                                <button
                                    className="guru-btn guru-btn--primary guru-btn--full"
                                    style={{ marginTop: 24 }}
                                    onClick={handleAdvanceClick}
                                    disabled={updating}
                                >
                                    {updating
                                        ? 'Updating...'
                                        : repair.status === REPAIR_STATUS.PENDING
                                            ? 'Claim This Job'
                                            : `Next: ${nextStatusLabel}`
                                    }
                                </button>
                            )}
                            {repair.status !== REPAIR_STATUS.COMPLETE && repair.status !== REPAIR_STATUS.CANCELLED && (
                                <button
                                    className="guru-btn guru-btn--danger guru-btn--full"
                                    style={{ marginTop: 10 }}
                                    onClick={() => setShowCancelModal(true)}
                                    disabled={updating}
                                >
                                    Cancel Repair
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════
                        LOCATION — Live sharing status during en_route
                        ════════════════════════════════════════════════ */}
                    {isEnRoute && (
                        <div className="loc-share">
                            <div className="loc-share__header">
                                <span className="loc-share__icon">📍</span>
                                <span className="loc-share__title">Live Location Sharing</span>
                            </div>
                            {isLocationSharing ? (
                                <>
                                    <div className="loc-share__status loc-share__status--active">
                                        <span className="loc-share__dot loc-share__dot--active"></span>
                                        Sharing your location with the customer
                                    </div>
                                    {techPosition && (
                                        <p className="loc-share__desc" style={{ marginTop: 8, marginBottom: 0 }}>
                                            GPS accuracy: ~{Math.round(techPosition.accuracy || 0)}m
                                        </p>
                                    )}
                                    <div className="loc-share__actions">
                                        <button
                                            className="guru-btn guru-btn--ghost guru-btn--sm"
                                            onClick={stopLocationSharing}
                                        >
                                            Stop Sharing
                                        </button>
                                    </div>
                                </>
                            ) : locationError ? (
                                <>
                                    <div className="loc-share__status loc-share__status--error">
                                        <span className="loc-share__dot loc-share__dot--error"></span>
                                        {locationError}
                                    </div>
                                    <div className="loc-share__actions">
                                        <button
                                            className="guru-btn guru-btn--primary guru-btn--sm"
                                            onClick={requestLocationPermission}
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="loc-share__desc">
                                        You haven't enabled location sharing yet. Share your location so the customer can track your arrival.
                                    </p>
                                    <div className="loc-share__actions">
                                        <button
                                            className="guru-btn guru-btn--primary guru-btn--sm"
                                            onClick={requestLocationPermission}
                                        >
                                            Start Sharing
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════
                        INFO — Customer + Schedule (side by side)
                        ════════════════════════════════════════════════ */}
                    <div className="repair-detail__grid repair-detail__grid--info">

                        {/* Customer Info */}
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Customer Information</h2>
                            <div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Name</span>
                                    <span className="repair-detail__row-value">{customerName}</span>
                                </div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Phone</span>
                                    <span className="repair-detail__row-value">{customerPhone}</span>
                                </div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Email</span>
                                    <span className="repair-detail__row-value">{customerEmail}</span>
                                </div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Location</span>
                                    <a
                                        href={`http://maps.apple.com/?q=${encodeURIComponent(repair.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="repair-detail__row-value"
                                        style={{ color: 'var(--guru-purple-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <span>{repair.address}</span>
                                        <span style={{ fontSize: '0.875rem' }}>🗺️</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Schedule</h2>
                            <div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Date</span>
                                    <span className="repair-detail__row-value">{repair.schedule_date ? repair.schedule_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : '—'}</span>
                                </div>
                                <div className="repair-detail__row">
                                    <span className="repair-detail__row-label">Time</span>
                                    <span className="repair-detail__row-value">{repair.schedule_time ? (TIME_SLOTS.find(s => s.id === repair.schedule_time)?.label + ' (' + TIME_SLOTS.find(s => s.id === repair.schedule_time)?.range + ')') : '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════
                        MIDDLE — Parts to Order + Chat
                        ════════════════════════════════════════════════ */}
                    <div className="repair-detail__middle">

                        {/* Parts to Order — only visible while parts are being ordered */}
                        {repair.status === REPAIR_STATUS.PARTS_ORDERED && issues.some(issueId => {
                            const tierObj = typeof repair.parts_tier === 'object' ? repair.parts_tier : {};
                            const tierId = tierObj[issueId] || 'premium';
                            return getPartsUrl(repair.device, issueId, tierId, repair.device_color);
                        }) && (
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Parts to Order</h2>
                                <div className="parts-links">
                                    {issues.map((issueId) => {
                                        const type = REPAIR_TYPES.find((t) => t.id === issueId);
                                        const tierObj = typeof repair.parts_tier === 'object' ? repair.parts_tier : {};
                                        const tierId = tierObj[issueId] || 'premium';
                                        const tier = PARTS_TIERS.find((t) => t.id === tierId);
                                        const partsUrl = getPartsUrl(repair.device, issueId, tierId, repair.device_color);
                                        if (!partsUrl) return null;
                                        return (
                                            <a
                                                key={issueId}
                                                href={partsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="parts-link"
                                            >
                                                <div className="parts-link__info">
                                                    <span className="parts-link__icon">{type?.icon}</span>
                                                    <div>
                                                        <div className="parts-link__name">{type?.name}</div>
                                                        <div className="parts-link__tier" style={{ color: tier?.color }}>{tier?.name}</div>
                                                    </div>
                                                </div>
                                                <span className="parts-link__arrow">Order →</span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Chat with Customer */}
                        {currentUserId && (
                            <div className="repair-detail__section" style={{ padding: 0, overflow: 'hidden' }}>
                                <RepairChat
                                    repairId={id}
                                    userId={currentUserId}
                                    senderRole="technician"
                                    senderName={techName}
                                />
                            </div>
                        )}
                    </div>

                    {/* ════════════════════════════════════════════════
                        BOTTOM — Payment / Pricing
                        ════════════════════════════════════════════════ */}
                    <div className="repair-detail__section repair-detail__payment">
                        <h2 className="repair-detail__section-title">
                            <span style={{ marginRight: 8 }}>💳</span>Payment &amp; Pricing
                        </h2>

                        {/* Payment status badge */}
                        {repair.payment_status === 'completed' && (
                            <div className="payment-status-badge payment-status-badge--paid">
                                <span>✓</span> Paid {repair.payment_method === 'cash' ? 'in Cash' : repair.payment_method === 'zelle' ? 'via Zelle' : repair.payment_method === 'cashapp' ? 'via CashApp' : repair.payment_method === 'venmo' ? 'via Venmo' : repair.payment_method === 'split' ? 'via Split Payment' : 'via ' + (repair.payment_method || 'Card')}
                                {repair.paid_at && (
                                    <span className="payment-status-badge__date">
                                        {' '}— {new Date(repair.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(repair.paid_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </span>
                                )}
                            </div>
                        )}
                        {repair.payment_status === 'pending' && (
                            <div className="payment-status-badge payment-status-badge--pending">
                                <span>⏳</span> Payment Pending
                            </div>
                        )}

                        <div className="pricing-breakdown">
                            {issues.map((issueId) => {
                                const type = REPAIR_TYPES.find((t) => t.id === issueId);
                                const tierObj = typeof repair.parts_tier === 'object' ? repair.parts_tier : {};
                                const tierId = tierObj[issueId] || 'premium';
                                const tier = PARTS_TIERS.find((t) => t.id === tierId);
                                const price = getDeviceRepairPrice(repair.device, issueId, tierId) ?? SAMPLE_PRICING[issueId]?.[tierId] ?? 0;
                                return (
                                    <div key={issueId} className="pricing-breakdown__line">
                                        <div className="pricing-breakdown__item">
                                            <span>{type?.icon} {type?.name}</span>
                                            <span className="pricing-breakdown__tier-tag" style={{ color: tier?.color }}>
                                                {tier?.name}
                                            </span>
                                        </div>
                                        <span className="pricing-breakdown__amount">${price}</span>
                                    </div>
                                );
                            })}
                            <div className="pricing-breakdown__line">
                                <span>🚗 On-site Service Fee</span>
                                <span className="pricing-breakdown__amount">${repair.service_fee || SERVICE_FEE}</span>
                            </div>
                            <div className="pricing-breakdown__line">
                                <span>🔧 Labor</span>
                                <span className="pricing-breakdown__amount">${repair.labor_fee || LABOR_FEE}</span>
                            </div>

                            <div className="pricing-breakdown__divider"></div>

                            {(() => {
                                const { subtotal, tax, grandTotal } = computeTotal();
                                return (
                                    <>
                                        <div className="pricing-breakdown__line">
                                            <span className="pricing-breakdown__label">Subtotal</span>
                                            <span className="pricing-breakdown__amount">${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="pricing-breakdown__line">
                                            <span className="pricing-breakdown__label">Sales Tax (8.25%)</span>
                                            <span className="pricing-breakdown__amount">${tax.toFixed(2)}</span>
                                        </div>
                                        <div className="pricing-breakdown__divider pricing-breakdown__divider--strong"></div>
                                        <div className="pricing-breakdown__total">
                                            <span>Total Due</span>
                                            <span className="pricing-breakdown__total-amount">
                                                ${grandTotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}

                            {/* Show recorded tip for completed payments */}
                            {repair.payment_status === 'completed' && repair.tip_amount > 0 && (
                                <div className="pricing-breakdown__line" style={{ marginTop: 4 }}>
                                    <span className="pricing-breakdown__label" style={{ color: 'var(--dark-success)' }}>Tip</span>
                                    <span className="pricing-breakdown__amount" style={{ color: 'var(--dark-success)' }}>
                                        ${Number(repair.tip_amount).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Collect Payment — single entry point */}
                        {repair.payment_status !== 'completed' && (
                            <button
                                className="payment-actions__btn payment-actions__btn--card"
                                style={{ width: '100%', marginTop: 24 }}
                                onClick={openPaymentModal}
                            >
                                <span className="payment-actions__icon">💳</span>
                                <span>Collect Payment</span>
                            </button>
                        )}
                    </div>

                    {/* ── Payment Wizard Modal (tip → method → signature) ── */}
                    {payment.showModal && (
                        <div
                            className="confirm-modal-overlay"
                            onClick={() => {
                                if (payment.processing || payment.step === 'signature') return;
                                closePaymentModal();
                            }}
                        >
                            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>

                                {/* ── Step 1: Tip selection (auto-advances on selection) ── */}
                                {payment.step === 'tip' && (() => {
                                    const { grandTotal } = computeTotal();
                                    const advance = (amount) => setTip(amount);
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">💰</div>
                                            <h3 className="confirm-modal__title">Add a Tip?</h3>
                                            <div className="payment-modal__summary">
                                                <div className="payment-modal__row payment-modal__row--total">
                                                    <span>Repair Total</span>
                                                    <span>${grandTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="tip-modal__grid">
                                                {[5, 10, 20].map(amount => (
                                                    <button
                                                        key={amount}
                                                        className="tip-modal__btn"
                                                        onClick={() => advance(amount)}
                                                    >
                                                        ${amount}
                                                    </button>
                                                ))}
                                                <button
                                                    className="tip-modal__btn tip-modal__btn--notip"
                                                    onClick={() => advance(0)}
                                                >
                                                    No Tip
                                                </button>
                                            </div>
                                            <div className="confirm-modal__actions" style={{ marginTop: 8 }}>
                                                <button className="guru-btn guru-btn--ghost" onClick={closePaymentModal}>Cancel</button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2a: Method selection ── */}
                                {payment.step === 'payment' && payment.method === null && (() => {
                                    const { grandTotal } = computeTotal();
                                    const amountDue = Math.round((grandTotal + payment.tipAmount) * 100) / 100;
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">💳</div>
                                            <h3 className="confirm-modal__title">How would you like to pay?</h3>
                                            <div className="payment-modal__summary">
                                                <div className="payment-modal__row">
                                                    <span>Repair Total</span>
                                                    <span>${grandTotal.toFixed(2)}</span>
                                                </div>
                                                {payment.tipAmount > 0 && (
                                                    <div className="payment-modal__row">
                                                        <span>Tip</span>
                                                        <span>${payment.tipAmount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="payment-modal__row payment-modal__row--total">
                                                    <span>Amount Due</span>
                                                    <span>${amountDue.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="payment-actions" style={{ flexDirection: 'column' }}>
                                                <button className="payment-actions__btn payment-actions__btn--cash" onClick={() => setMethod('cash')}>
                                                    <span className="payment-actions__icon">💵</span>
                                                    <span>Cash</span>
                                                </button>
                                                <button className="payment-actions__btn payment-actions__btn--zelle" onClick={() => setMethod('zelle')}>
                                                    <span className="payment-actions__icon">🏦</span>
                                                    <span>Zelle</span>
                                                </button>
                                                <button className="payment-actions__btn payment-actions__btn--cashapp" onClick={() => setMethod('cashapp')}>
                                                    <span className="payment-actions__icon">💲</span>
                                                    <span>CashApp</span>
                                                </button>
                                                <button className="payment-actions__btn payment-actions__btn--venmo" onClick={() => setMethod('venmo')}>
                                                    <span className="payment-actions__icon">💜</span>
                                                    <span>Venmo</span>
                                                </button>
                                            </div>
                                            <div className="confirm-modal__actions" style={{ marginTop: 8 }}>
                                                <button className="guru-btn guru-btn--ghost" onClick={backToTip}>← Back</button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2b: Cash — enter received amount + show change ── */}
                                {payment.step === 'payment' && payment.method === 'cash' && (() => {
                                    const { grandTotal } = computeTotal();
                                    const amountDue = Math.round((grandTotal + payment.tipAmount) * 100) / 100;
                                    const cashNum = Math.round((parseFloat(payment.cashReceived) || 0) * 100) / 100;
                                    const changeDue = cashNum - amountDue;
                                    const hasEnough = cashNum >= amountDue;
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">💵</div>
                                            <h3 className="confirm-modal__title">Cash Payment</h3>
                                            <div className="payment-modal__summary">
                                                {payment.tipAmount > 0 && (
                                                    <div className="payment-modal__row">
                                                        <span>Tip</span>
                                                        <span>${payment.tipAmount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="payment-modal__row payment-modal__row--total">
                                                    <span>Amount Due</span>
                                                    <span>${amountDue.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="cash-change">
                                                <label className="cash-change__label">Cash Received</label>
                                                <div className="cash-change__input-wrap">
                                                    <span className="cash-change__prefix">$</span>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        placeholder="0.00"
                                                        value={payment.cashReceived}
                                                        autoFocus
                                                        onChange={(e) => setCashReceived(e.target.value)}
                                                        className="cash-change__input"
                                                    />
                                                </div>
                                                {cashNum > 0 && (
                                                    <div className={`cash-change__result ${hasEnough ? 'cash-change__result--ok' : 'cash-change__result--err'}`}>
                                                        {hasEnough ? (
                                                            <>
                                                                <span>Change Due</span>
                                                                <span>${changeDue.toFixed(2)}</span>
                                                            </>
                                                        ) : (
                                                            <span>${(amountDue - cashNum).toFixed(2)} short</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {payment.error && <div className="payment-modal__error">{payment.error}</div>}

                                            {/* Split payment — show when partial cash entered */}
                                            {cashNum > 0 && !hasEnough && (
                                                <div style={{ margin: 'var(--space-3) 0', textAlign: 'left' }}>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--dark-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
                                                        Pay remaining ${(amountDue - cashNum).toFixed(2)} via
                                                    </p>
                                                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                                        <button
                                                            className="payment-actions__btn payment-actions__btn--zelle"
                                                            style={{ flex: 1, padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', minWidth: 80 }}
                                                            onClick={() => {
                                                                setSplitCash(cashNum);
                                                                setMethod('zelle');
                                                            }}
                                                            disabled={payment.processing}
                                                        >
                                                            🏦 Zelle
                                                        </button>
                                                        <button
                                                            className="payment-actions__btn payment-actions__btn--cashapp"
                                                            style={{ flex: 1, padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', minWidth: 80 }}
                                                            onClick={() => {
                                                                setSplitCash(cashNum);
                                                                setMethod('cashapp');
                                                            }}
                                                            disabled={payment.processing}
                                                        >
                                                            💲 CashApp
                                                        </button>
                                                        <button
                                                            className="payment-actions__btn payment-actions__btn--venmo"
                                                            style={{ flex: 1, padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)', minWidth: 80 }}
                                                            onClick={() => {
                                                                setSplitCash(cashNum);
                                                                setMethod('venmo');
                                                            }}
                                                            disabled={payment.processing}
                                                        >
                                                            💜 Venmo
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="confirm-modal__actions">
                                                <button className="guru-btn guru-btn--ghost" onClick={backToMethod} disabled={payment.processing}>← Back</button>
                                                <button className="guru-btn guru-btn--primary" onClick={handleCashPayment} disabled={payment.processing || !hasEnough || cashNum === 0}>
                                                    {payment.processing ? 'Processing...' : 'Confirm Cash Received'}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2c: Peer-to-peer payment (Zelle / CashApp / Venmo) ── */}
                                {payment.step === 'payment' && ['zelle', 'cashapp', 'venmo'].includes(payment.method) && (() => {
                                    const { grandTotal } = computeTotal();
                                    const amountDue = Math.round((grandTotal + payment.tipAmount) * 100) / 100;
                                    const methodLabels = { zelle: 'Zelle', cashapp: 'CashApp', venmo: 'Venmo' };
                                    const methodIcons = { zelle: '🏦', cashapp: '💲', venmo: '💜' };
                                    const label = methodLabels[payment.method];
                                    const icon = methodIcons[payment.method];
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">{icon}</div>
                                            <h3 className="confirm-modal__title">{label} Payment</h3>
                                            <div className="payment-modal__summary">
                                                {payment.splitCashAmount > 0 ? (
                                                    <>
                                                        <div className="payment-modal__row">
                                                            <span>Cash Collected</span>
                                                            <span>${payment.splitCashAmount.toFixed(2)}</span>
                                                        </div>
                                                        <div className="payment-modal__row payment-modal__row--total">
                                                            <span>{label} Amount</span>
                                                            <span>${(amountDue - payment.splitCashAmount).toFixed(2)}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="payment-modal__row payment-modal__row--total">
                                                        <span>Amount Due</span>
                                                        <span>${amountDue.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ background: 'var(--dark-bg-elevated, #1e1e2e)', borderRadius: 12, padding: 'var(--space-4)', margin: 'var(--space-3) 0', textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                                                    Have the customer send <strong style={{ color: 'var(--text-primary)' }}>${payment.splitCashAmount > 0 ? (amountDue - payment.splitCashAmount).toFixed(2) : amountDue.toFixed(2)}</strong> via {label}.
                                                </p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--dark-text-tertiary)', lineHeight: 1.5 }}>
                                                    Verify the payment has been received in your {label} account before confirming below.
                                                </p>
                                            </div>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-4) 0', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={payment.peerConfirmed}
                                                    onChange={(e) => setPeerConfirmed(e.target.checked)}
                                                    style={{ width: 20, height: 20, accentColor: 'var(--dark-accent-400, #7C3AED)' }}
                                                />
                                                I confirm payment was received via {label}
                                            </label>

                                            {payment.error && <div className="payment-modal__error">{payment.error}</div>}

                                            <div className="confirm-modal__actions">
                                                <button className="guru-btn guru-btn--ghost" onClick={backToMethod}>
                                                    ← Back
                                                </button>
                                                <button
                                                    className="guru-btn guru-btn--primary"
                                                    onClick={handlePeerPayment}
                                                    disabled={!payment.peerConfirmed || payment.processing}
                                                >
                                                    {payment.processing ? 'Processing...' : `Confirm ${label} Payment`}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 3: Completion signature ── */}
                                {payment.step === 'signature' && (
                                    <>
                                        <div className="confirm-modal__icon">✅</div>
                                        <h3 className="confirm-modal__title">Repair Complete!</h3>
                                        <p className="confirm-modal__message">Please sign below to confirm the repair is done and payment has been received.</p>
                                        <canvas
                                            ref={canvasRef}
                                            style={{ width: '100%', height: 160, border: '2px solid var(--border-subtle)', borderRadius: 12, cursor: 'crosshair', background: '#fff', display: 'block' }}
                                        />
                                        <div className="confirm-modal__actions" style={{ marginTop: 12 }}>
                                            <button className="guru-btn guru-btn--ghost" onClick={clearSignature}>Clear</button>
                                            <button className="guru-btn guru-btn--primary" onClick={saveCompletionSignature}>
                                                {updating ? 'Saving...' : 'Sign & Complete'}
                                            </button>
                                        </div>
                                    </>
                                )}

                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════
                        EXTRAS — Photos + Legal
                        ════════════════════════════════════════════════ */}

                    {/* Repair Photos — visible once repair is in progress */}
                    {statusFlow.indexOf(repair.status) >= statusFlow.indexOf(REPAIR_STATUS.IN_PROGRESS) && <div className="repair-detail__section">
                        <h2 className="repair-detail__section-title">Repair Photos</h2>
                        <p className="repair-photos__note">
                            For technician records only — not visible to customers.
                        </p>

                        <div className="repair-photos__upload">
                            <div className="repair-photos__type-toggle">
                                <button
                                    className={`repair-photos__type-btn ${photoType === 'before' ? 'repair-photos__type-btn--active' : ''}`}
                                    onClick={() => setPhotoType('before')}
                                >
                                    Before
                                </button>
                                <button
                                    className={`repair-photos__type-btn ${photoType === 'after' ? 'repair-photos__type-btn--active' : ''}`}
                                    onClick={() => setPhotoType('after')}
                                >
                                    After
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/heic,image/heif,.jpg,.jpeg,.heic,.heif"
                                capture="environment"
                                onChange={handlePhotoUpload}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="guru-btn guru-btn--primary guru-btn--sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : `Upload ${photoType} photo`}
                            </button>
                        </div>

                        {photoError && (
                            <div className="repair-photos__error">{photoError}</div>
                        )}

                        {beforePhotos.length > 0 && (
                            <div className="repair-photos__group">
                                <h3 className="repair-photos__group-label">Before</h3>
                                <div className="repair-photos__grid">
                                    {beforePhotos.map(photo => (
                                        <div key={photo.id} className="repair-photos__item">
                                            {photo.signedUrl && !photo.content_type?.includes('heic') && !photo.content_type?.includes('heif') ? (
                                                <img
                                                    src={photo.signedUrl}
                                                    alt={photo.file_name || 'Before photo'}
                                                    className="repair-photos__img"
                                                    onClick={() => setExpandedPhoto(photo)}
                                                />
                                            ) : (
                                                <div className="repair-photos__heic-placeholder" onClick={() => {
                                                    if (photo.signedUrl) window.open(photo.signedUrl, '_blank');
                                                }}>
                                                    <span className="repair-photos__heic-icon">HEIC</span>
                                                    <span className="repair-photos__heic-name">{photo.file_name}</span>
                                                </div>
                                            )}
                                            <button
                                                className="repair-photos__delete-btn"
                                                onClick={() => handlePhotoDelete(photo)}
                                                title="Delete photo"
                                            >
                                                x
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {afterPhotos.length > 0 && (
                            <div className="repair-photos__group">
                                <h3 className="repair-photos__group-label">After</h3>
                                <div className="repair-photos__grid">
                                    {afterPhotos.map(photo => (
                                        <div key={photo.id} className="repair-photos__item">
                                            {photo.signedUrl && !photo.content_type?.includes('heic') && !photo.content_type?.includes('heif') ? (
                                                <img
                                                    src={photo.signedUrl}
                                                    alt={photo.file_name || 'After photo'}
                                                    className="repair-photos__img"
                                                    onClick={() => setExpandedPhoto(photo)}
                                                />
                                            ) : (
                                                <div className="repair-photos__heic-placeholder" onClick={() => {
                                                    if (photo.signedUrl) window.open(photo.signedUrl, '_blank');
                                                }}>
                                                    <span className="repair-photos__heic-icon">HEIC</span>
                                                    <span className="repair-photos__heic-name">{photo.file_name}</span>
                                                </div>
                                            )}
                                            <button
                                                className="repair-photos__delete-btn"
                                                onClick={() => handlePhotoDelete(photo)}
                                                title="Delete photo"
                                            >
                                                x
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {photos.length === 0 && !photosLoading && (
                            <div className="repair-photos__empty">
                                No photos uploaded yet. Use the upload button above to add before/after photos.
                            </div>
                        )}

                        {photosLoading && (
                            <div className="repair-photos__empty">Loading photos...</div>
                        )}
                    </div>}

                    {/* Expanded Photo Modal */}
                    {expandedPhoto && (
                        <div className="repair-photos__modal" onClick={() => setExpandedPhoto(null)}>
                            <div className="repair-photos__modal-content" onClick={(e) => e.stopPropagation()}>
                                <img
                                    src={expandedPhoto.signedUrl}
                                    alt={expandedPhoto.file_name || 'Repair photo'}
                                    className="repair-photos__modal-img"
                                />
                                <div className="repair-photos__modal-info">
                                    <span className={`guru-badge ${expandedPhoto.photo_type === 'before' ? 'guru-badge--warning' : 'guru-badge--success'}`}>
                                        {expandedPhoto.photo_type === 'before' ? 'Before' : 'After'}
                                    </span>
                                    <span className="repair-photos__modal-name">{expandedPhoto.file_name}</span>
                                </div>
                                <button
                                    className="repair-photos__modal-close"
                                    onClick={() => setExpandedPhoto(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Intake Authorization — appears when tech arrives, stays as confirmation */}
                    {statusFlow.indexOf(repair.status) >= statusFlow.indexOf(REPAIR_STATUS.ARRIVED) && (
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Customer Authorization</h2>
                            {(intakeSigned || repair.signature_path) ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--dark-success)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Intake signature collected</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Customer authorized the repair before work began.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                                        Get the customer's signature to authorize the repair before you begin work.
                                    </p>
                                    <button className="guru-btn guru-btn--primary guru-btn--full" onClick={() => setShowIntakeSignature(true)}>
                                        Get Customer Authorization
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Completion Authorization — shown after repair is complete */}
                    {repair.status === REPAIR_STATUS.COMPLETE && (
                        <div className="repair-detail__section">
                            <h2 className="repair-detail__section-title">Completion Authorization</h2>
                            {(completionSigned || repair.completion_signature_path) ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--dark-success)' }}>
                                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Completion signature collected</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Customer confirmed the repair and payment.
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: '0.875rem' }}>Completion signature not yet collected.</div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* ── Intake Signature Modal ─────────────────────────────── */}
            {showIntakeSignature && (
                <div className="confirm-modal-overlay" onClick={() => setShowIntakeSignature(false)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="confirm-modal__icon">📋</div>
                        <h3 className="confirm-modal__title">Customer Authorization</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 16, maxHeight: 180, overflowY: 'auto', padding: 12, background: 'var(--bg-app)', borderRadius: 12, textAlign: 'left' }}>
                            {AGREEMENT_TEXT}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Please sign below to authorize the repair
                        </p>
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: 160, border: '2px solid var(--border-subtle)', borderRadius: 12, cursor: 'crosshair', background: '#fff', display: 'block' }}
                        />
                        <div className="confirm-modal__actions" style={{ marginTop: 12 }}>
                            <button className="guru-btn guru-btn--ghost" onClick={clearSignature}>Clear</button>
                            <button className="guru-btn guru-btn--ghost" onClick={() => setShowIntakeSignature(false)}>Cancel</button>
                            <button className="guru-btn guru-btn--primary" onClick={saveIntakeSignature}>Save Signature</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

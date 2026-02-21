import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW, REPAIR_TYPES, PARTS_TIERS, SAMPLE_PRICING, getPartsUrl, getDeviceRepairPrice, SERVICE_FEE, LABOR_FEE, TAX_RATE, TIP_PRESETS, getRepairStatusFlow, TIME_SLOTS } from '@shared/constants';
import { supabase } from '@shared/supabase';
import { useLocationBroadcast } from '@shared/useLocationBroadcast';
import RepairChat from '@shared/RepairChat';
import TechNav from '../components/TechNav';
import '@shared/repair-chat.css';
import '@shared/live-tracking.css';
import '../styles/tech-repair-detail.css';

const AGREEMENT_TEXT = `GURU MOBILE REPAIR AGREEMENT

By signing below, I authorize Guru Mobile Repair Solutions ("Guru") to perform the repair service(s) described in this work order on my device.

I acknowledge that:
1. I am the rightful owner of the device submitted for repair.
2. I understand the estimated cost and repair details as presented.
3. Guru is not responsible for pre-existing conditions or damage unrelated to the requested repair.
4. Data backup is my responsibility. Guru is not liable for any data loss during repair.
5. The selected parts tier and associated quality level have been explained to me.
6. Repair times are estimates and may vary based on device condition.

I agree to these terms and authorize the repair to proceed.`;

export default function RepairDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [repair, setRepair] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSignature, setShowSignature] = useState(false);
    const [signed, setSigned] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [techName, setTechName] = useState('');
    const canvasRef = useRef(null);
    const sigPadRef = useRef(null);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState(null); // { nextStatus, nextLabel, isClaim }

    // Photo state
    const [photos, setPhotos] = useState([]);
    const [photosLoading, setPhotosLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [photoType, setPhotoType] = useState('before');
    const [photoError, setPhotoError] = useState('');
    const [expandedPhoto, setExpandedPhoto] = useState(null);
    const fileInputRef = useRef(null);

    // Payment state
    const [tipAmount, setTipAmount] = useState(0);
    const [customTip, setCustomTip] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'stripe'
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    // Stripe multi-step state
    const [stripePhase, setStripePhase] = useState('idle'); // 'idle' | 'loading' | 'card_entry' | 'confirming'
    const [stripeClientSecret, setStripeClientSecret] = useState(null);
    const [stripeInstance, setStripeInstance] = useState(null);
    const [stripeElements, setStripeElements] = useState(null);
    const stripeElementRef = useRef(null);

    // Location sharing state
    const [locationModal, setLocationModal] = useState(false);
    const isEnRoute = repair?.status === REPAIR_STATUS.EN_ROUTE;

    const {
        isSharing: isLocationSharing,
        error: locationError,
        position: techPosition,
        permissionState: locationPermission,
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
                console.error('Repair not found:', error);
                setLoading(false);
                return;
            }

            setRepair(data);
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

    // Initialize signature pad
    useEffect(() => {
        if (showSignature && canvasRef.current && !sigPadRef.current) {
            import('signature_pad').then(({ default: SignaturePad }) => {
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
    }, [showSignature]);

    // Fetch repair photos
    useEffect(() => {
        const fetchPhotos = async () => {
            setPhotosLoading(true);
            const { data, error } = await supabase
                .from('repair_photos')
                .select('*')
                .eq('repair_id', id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                const photosWithUrls = await Promise.all(
                    data.map(async (photo) => {
                        const { data: urlData } = await supabase.storage
                            .from('repair-photos')
                            .createSignedUrl(photo.file_path, 3600);
                        return { ...photo, signedUrl: urlData?.signedUrl || null };
                    })
                );
                setPhotos(photosWithUrls);
            }
            setPhotosLoading(false);
        };

        fetchPhotos();
    }, [id]);

    // Upload photo handler
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/heic', 'image/heif'];
        const validExtensions = ['.jpg', '.jpeg', '.heic', '.heif'];
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            setPhotoError('Only JPEG and HEIC files are accepted.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            setPhotoError('File size must be under 20MB.');
            return;
        }

        setUploading(true);
        setPhotoError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const timestamp = Date.now();
            const fileExt = ext || '.jpg';
            const filePath = `repairs/${id}/${photoType}_${timestamp}${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('repair-photos')
                .upload(filePath, file, { contentType: file.type || 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: photoRecord, error: insertError } = await supabase
                .from('repair_photos')
                .insert({
                    repair_id: id,
                    technician_id: user.id,
                    photo_type: photoType,
                    file_path: filePath,
                    file_name: file.name,
                    content_type: file.type || 'image/jpeg',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const { data: urlData } = await supabase.storage
                .from('repair-photos')
                .createSignedUrl(filePath, 3600);

            setPhotos(prev => [...prev, { ...photoRecord, signedUrl: urlData?.signedUrl || null }]);
        } catch (err) {
            console.error('Photo upload failed:', err);
            setPhotoError(err.message || 'Upload failed. Please try again.');
        }

        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Delete photo handler
    const handlePhotoDelete = async (photo) => {
        if (!window.confirm('Delete this photo? This cannot be undone.')) return;
        try {
            await supabase.storage
                .from('repair-photos')
                .remove([photo.file_path]);

            await supabase
                .from('repair_photos')
                .delete()
                .eq('id', photo.id);

            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (expandedPhoto?.id === photo.id) setExpandedPhoto(null);
        } catch (err) {
            console.error('Photo delete failed:', err);
            setPhotoError('Failed to delete photo. Please try again.');
        }
    };

    const beforePhotos = photos.filter(p => p.photo_type === 'before');
    const afterPhotos = photos.filter(p => p.photo_type === 'after');

    const clearSignature = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
        }
    };

    const saveSignature = async () => {
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            const signatureData = sigPadRef.current.toDataURL();

            try {
                const blob = await (await fetch(signatureData)).blob();
                const fileName = `signatures/${id}_${Date.now()}.png`;
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
                console.log('Signature storage skipped (bucket may not exist):', err.message);
            }

            setSigned(true);
            setShowSignature(false);
        }
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

    const handleTipSelect = (value) => {
        setTipAmount(value);
        setCustomTip('');
    };

    const handleCustomTipChange = (e) => {
        const val = e.target.value.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = val.split('.');
        const sanitized = parts.length > 2
            ? parts[0] + '.' + parts.slice(1).join('')
            : val;
        setCustomTip(sanitized);
        setTipAmount(sanitized ? parseFloat(sanitized) || 0 : 0);
    };

    const openPaymentModal = (method) => {
        setPaymentMethod(method);
        setPaymentError('');
        setStripePhase('idle');
        setStripeClientSecret(null);
        setStripeInstance(null);
        setStripeElements(null);
        setShowPaymentModal(true);
    };

    const handleCashPayment = async () => {
        setPaymentProcessing(true);
        setPaymentError('');
        try {
            const { grandTotal } = computeTotal();
            const { error } = await supabase
                .from('repairs')
                .update({
                    payment_method: 'cash',
                    payment_status: 'completed',
                    tip_amount: tipAmount,
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', repair.id);

            if (error) throw error;
            setRepair(prev => ({
                ...prev,
                payment_method: 'cash',
                payment_status: 'completed',
                tip_amount: tipAmount,
                paid_at: new Date().toISOString(),
            }));
            setShowPaymentModal(false);
        } catch (err) {
            console.error('Cash payment error:', err);
            setPaymentError(err.message || 'Failed to record cash payment.');
        }
        setPaymentProcessing(false);
    };

    // Step 1: Create PaymentIntent + load Stripe.js → triggers PaymentElement mount via useEffect
    const handleStripePayment = async () => {
        setPaymentProcessing(true);
        setPaymentError('');
        setStripePhase('loading');
        try {
            const { grandTotal } = computeTotal();

            const { data: fnData, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    repair_id: repair.id,
                    amount: grandTotal,
                    tip_amount: tipAmount,
                },
            });

            if (fnError) throw fnError;
            if (fnData?.error) throw new Error(fnData.error);

            const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
            if (!stripePublicKey) throw new Error('Stripe public key not configured. Add VITE_STRIPE_PUBLIC_KEY to your .env file.');

            const { loadStripe } = await import('https://esm.sh/@stripe/stripe-js@2');
            const stripe = await loadStripe(stripePublicKey);
            if (!stripe) throw new Error('Failed to load Stripe.');

            // Setting these triggers the useEffect that mounts the PaymentElement
            setStripeInstance(stripe);
            setStripeClientSecret(fnData.clientSecret);
            // paymentProcessing cleared in the useEffect after element mounts
        } catch (err) {
            console.error('Stripe setup error:', err);
            setPaymentError(err.message || 'Failed to initialize card payment.');
            setStripePhase('idle');
            setPaymentProcessing(false);
        }
    };

    // Step 2: Confirm payment using the mounted Stripe Elements instance
    const confirmStripePayment = async () => {
        if (!stripeInstance || !stripeElements) return;
        setStripePhase('confirming');
        setPaymentError('');

        const { error: confirmError } = await stripeInstance.confirmPayment({
            elements: stripeElements,
            confirmParams: {
                return_url: window.location.href.split('?')[0],
            },
        });

        if (confirmError) {
            setPaymentError(confirmError.message);
            setStripePhase('card_entry');
        }
        // On success Stripe redirects — existing useEffect handles the redirect callback
    };

    // Check for Stripe redirect success on page load
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentIntent = urlParams.get('payment_intent');
        const redirectStatus = urlParams.get('redirect_status');

        if (paymentIntent && redirectStatus === 'succeeded') {
            // Mark payment as completed
            supabase
                .from('repairs')
                .update({
                    payment_status: 'completed',
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .then(({ error }) => {
                    if (!error) {
                        setRepair(prev => prev ? ({
                            ...prev,
                            payment_status: 'completed',
                            paid_at: new Date().toISOString(),
                        }) : prev);
                    }
                });

            // Clean URL params
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [id]);

    // Mount Stripe PaymentElement once stripe instance + clientSecret are ready
    useEffect(() => {
        if (!stripeClientSecret || !stripeInstance || !stripeElementRef.current) return;

        const elements = stripeInstance.elements({
            clientSecret: stripeClientSecret,
            appearance: { theme: 'night' },
        });
        const paymentElement = elements.create('payment');
        paymentElement.mount(stripeElementRef.current);
        setStripeElements(elements);
        setStripePhase('card_entry');
        setPaymentProcessing(false);

        return () => {
            paymentElement.unmount();
        };
    }, [stripeClientSecret, stripeInstance]);

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

                        {/* Parts to Order */}
                        {issues.some(issueId => {
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
                                <span>✓</span> Paid {repair.payment_method === 'cash' ? 'in Cash' : 'via Card'}
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

                            {/* Tip Section */}
                            {repair.payment_status !== 'completed' && (
                                <>
                                    <div className="pricing-breakdown__divider"></div>
                                    <div className="tip-section">
                                        <span className="tip-section__label">Add a Tip</span>
                                        <div className="tip-section__presets">
                                            {TIP_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.value}
                                                    className={`tip-section__btn ${tipAmount === preset.value && !customTip ? 'tip-section__btn--active' : ''}`}
                                                    onClick={() => handleTipSelect(preset.value)}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                            <div className="tip-section__custom">
                                                <span className="tip-section__custom-prefix">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="Other"
                                                    value={customTip}
                                                    onChange={handleCustomTipChange}
                                                    className="tip-section__custom-input"
                                                />
                                            </div>
                                        </div>
                                        {tipAmount > 0 && (
                                            <div className="pricing-breakdown__line" style={{ marginTop: 8 }}>
                                                <span className="pricing-breakdown__label" style={{ color: 'var(--dark-success)' }}>Tip</span>
                                                <span className="pricing-breakdown__amount" style={{ color: 'var(--dark-success)' }}>
                                                    ${tipAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Show recorded tip for completed payments */}
                            {repair.payment_status === 'completed' && repair.tip_amount > 0 && (
                                <div className="pricing-breakdown__line" style={{ marginTop: 4 }}>
                                    <span className="pricing-breakdown__label" style={{ color: 'var(--dark-success)' }}>Tip</span>
                                    <span className="pricing-breakdown__amount" style={{ color: 'var(--dark-success)' }}>
                                        ${Number(repair.tip_amount).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Grand Total with Tip */}
                            {tipAmount > 0 && repair.payment_status !== 'completed' && (() => {
                                const { grandTotal } = computeTotal();
                                return (
                                    <>
                                        <div className="pricing-breakdown__divider pricing-breakdown__divider--strong"></div>
                                        <div className="pricing-breakdown__total">
                                            <span>Total with Tip</span>
                                            <span className="pricing-breakdown__total-amount">
                                                ${(grandTotal + tipAmount).toFixed(2)}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Collect Payment Buttons */}
                        {repair.payment_status !== 'completed' && (
                            <div className="payment-actions">
                                <button
                                    className="payment-actions__btn payment-actions__btn--cash"
                                    onClick={() => openPaymentModal('cash')}
                                >
                                    <span className="payment-actions__icon">💵</span>
                                    <span>Pay with Cash</span>
                                </button>
                                <button
                                    className="payment-actions__btn payment-actions__btn--card"
                                    onClick={() => openPaymentModal('stripe')}
                                >
                                    <span className="payment-actions__icon">💳</span>
                                    <span>Pay with Card</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Payment Confirmation Modal ─────────────────────── */}
                    {showPaymentModal && (
                        <div
                            className="confirm-modal-overlay"
                            onClick={() => {
                                if (paymentProcessing || stripePhase === 'loading' || stripePhase === 'confirming') return;
                                setShowPaymentModal(false);
                                setStripePhase('idle');
                                setStripeClientSecret(null);
                                setStripeInstance(null);
                                setStripeElements(null);
                                setPaymentError('');
                            }}
                        >
                            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="confirm-modal__icon">
                                    {paymentMethod === 'cash' ? '💵' : '💳'}
                                </div>
                                <h3 className="confirm-modal__title">
                                    {paymentMethod === 'cash'
                                        ? 'Confirm Cash Payment'
                                        : stripePhase === 'card_entry' || stripePhase === 'confirming'
                                            ? 'Enter Card Details'
                                            : 'Process Card Payment'
                                    }
                                </h3>

                                {/* Description — only on initial confirmation screen */}
                                {(paymentMethod === 'cash' || stripePhase === 'idle') && (
                                    <p className="confirm-modal__message">
                                        {paymentMethod === 'cash'
                                            ? 'Confirm that you have collected the cash payment from the customer.'
                                            : 'The customer will enter their card details via Stripe\'s secure form.'
                                        }
                                    </p>
                                )}

                                {/* Amount summary — cash always, stripe only on idle phase */}
                                {(paymentMethod === 'cash' || stripePhase === 'idle') && (() => {
                                    const { grandTotal } = computeTotal();
                                    return (
                                        <div className="payment-modal__summary">
                                            <div className="payment-modal__row">
                                                <span>Repair Total</span>
                                                <span>${grandTotal.toFixed(2)}</span>
                                            </div>
                                            {tipAmount > 0 && (
                                                <div className="payment-modal__row">
                                                    <span>Tip</span>
                                                    <span>${tipAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="payment-modal__row payment-modal__row--total">
                                                <span>Amount to Collect</span>
                                                <span>${(grandTotal + tipAmount).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Stripe PaymentElement container — rendered while loading so ref is ready */}
                                {paymentMethod === 'stripe' && stripePhase !== 'idle' && (
                                    <div className="stripe-payment-element-wrapper">
                                        {stripePhase === 'loading' && (
                                            <div className="stripe-loading">Loading secure payment form...</div>
                                        )}
                                        <div
                                            ref={stripeElementRef}
                                            style={{ display: stripePhase === 'loading' ? 'none' : 'block', marginTop: 8 }}
                                        />
                                    </div>
                                )}

                                {paymentError && (
                                    <div className="payment-modal__error">{paymentError}</div>
                                )}

                                <div className="confirm-modal__actions">
                                    <button
                                        className="guru-btn guru-btn--ghost"
                                        onClick={() => {
                                            setShowPaymentModal(false);
                                            setStripePhase('idle');
                                            setStripeClientSecret(null);
                                            setStripeInstance(null);
                                            setStripeElements(null);
                                            setPaymentError('');
                                        }}
                                        disabled={stripePhase === 'loading' || stripePhase === 'confirming'}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="guru-btn guru-btn--primary"
                                        onClick={
                                            paymentMethod === 'cash'
                                                ? handleCashPayment
                                                : stripePhase === 'card_entry'
                                                    ? confirmStripePayment
                                                    : handleStripePayment
                                        }
                                        disabled={
                                            paymentProcessing ||
                                            stripePhase === 'loading' ||
                                            stripePhase === 'confirming'
                                        }
                                    >
                                        {paymentMethod === 'cash'
                                            ? (paymentProcessing ? 'Processing...' : 'Confirm Cash Received')
                                            : stripePhase === 'idle'
                                                ? 'Proceed to Card Payment'
                                                : stripePhase === 'loading'
                                                    ? 'Loading...'
                                                    : stripePhase === 'card_entry'
                                                        ? 'Pay Now'
                                                        : 'Processing...'
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════════════════
                        EXTRAS — Photos + Legal
                        ════════════════════════════════════════════════ */}

                    {/* Repair Photos */}
                    <div className="repair-detail__section">
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
                    </div>

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

                    {/* Legal Documentation */}
                    <div className="repair-detail__section">
                        <h2 className="repair-detail__section-title">Legal Documentation</h2>
                        {signed ? (
                            <div style={{ textAlign: 'center', padding: 24, color: 'var(--guru-success)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                                <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Customer has signed the agreement</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Signed at {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </div>
                            </div>
                        ) : showSignature ? (
                            <>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 16, maxHeight: 200, overflowY: 'auto', padding: 16, background: 'var(--bg-app)', borderRadius: 12 }}>
                                    {AGREEMENT_TEXT}
                                </div>
                                <div className="signature-area">
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        Please sign below
                                    </p>
                                    <canvas ref={canvasRef} style={{ width: '100%', height: 200, border: '1px solid var(--border-subtle)', borderRadius: 12, cursor: 'crosshair' }}></canvas>
                                    <div className="signature-area__actions">
                                        <button className="guru-btn guru-btn--ghost guru-btn--sm" onClick={clearSignature}>
                                            Clear
                                        </button>
                                        <button className="guru-btn guru-btn--secondary guru-btn--sm" onClick={() => setShowSignature(false)}>
                                            Cancel
                                        </button>
                                        <button className="guru-btn guru-btn--primary guru-btn--sm" onClick={saveSignature}>
                                            Save Signature
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <button className="guru-btn guru-btn--primary guru-btn--full" onClick={() => setShowSignature(true)}>
                                Open Repair Agreement for Signature
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </>
    );
}

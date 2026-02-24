import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW, REPAIR_TYPES, PARTS_TIERS, SAMPLE_PRICING, getPartsUrl, getDeviceRepairPrice, SERVICE_FEE, LABOR_FEE, TAX_RATE, getRepairStatusFlow, TIME_SLOTS } from '@shared/constants';
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
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentModalStep, setPaymentModalStep] = useState('tip'); // 'tip' | 'payment' | 'signature'
    const [paymentMethod, setPaymentMethod] = useState(null); // 'cash' | 'square-qr' | 'square-tap'
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    // Cash change calculator state
    const [cashReceived, setCashReceived] = useState('');

    // Square payment state
    const [squarePaymentUrl, setSquarePaymentUrl] = useState(null);
    const [squarePhase, setSquarePhase] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'waiting'
    const [splitCashAmount, setSplitCashAmount] = useState(0); // cash collected in a split payment

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
                console.error('Repair not found:', error);
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
        const needsSig = showIntakeSignature || (showPaymentModal && paymentModalStep === 'signature');
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
    }, [showIntakeSignature, showPaymentModal, paymentModalStep]);

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
            console.log('Intake signature storage skipped:', err.message);
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
            console.log('Completion signature storage skipped:', err.message);
        }
        setCompletionSigned(true);
        await finalizeRepair();
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentModalStep('tip');
        setPaymentMethod(null);
        setSquarePaymentUrl(null);
        setSquarePhase('idle');
        setPaymentError('');
        setCashReceived('');
        setSplitCashAmount(0);
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
                        tip_amount: repair.tip_amount || tipAmount,
                        payment_method: repair.payment_method,
                        paid_at: repair.paid_at || new Date().toISOString(),
                    },
                }).catch((err) => console.error('Invoice email error:', err));
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
            setPaymentModalStep('tip');
            setPaymentMethod(null);
            setPaymentError('');
            setSquarePaymentUrl(null);
            setSquarePhase('idle');
            setShowPaymentModal(true);
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
        setPaymentProcessing(true);
        setPaymentError('');
        try {
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
            // Advance to completion signature step
            setPaymentModalStep('signature');
        } catch (err) {
            console.error('Cash payment error:', err);
            setPaymentError(err.message || 'Failed to record cash payment.');
        }
        setPaymentProcessing(false);
    };

    // Square QR: create a hosted Square payment link → show as QR for customer to scan
    // cashPortion: amount already collected in cash (split payment), 0 for full card payment
    const handleSquareQRPayment = async (cashPortion = 0) => {
        setPaymentProcessing(true);
        setPaymentError('');
        setSquarePhase('loading');
        try {
            const { grandTotal } = computeTotal();
            const totalDue = grandTotal + tipAmount;
            const chargeAmount = cashPortion > 0 ? totalDue - cashPortion : grandTotal;
            const chargeTip = cashPortion > 0 ? 0 : tipAmount;
            if (cashPortion > 0) {
                sessionStorage.setItem(`split_cash_${repair.id}`, cashPortion.toString());
            }
            const issueNames = issues.map(iid => REPAIR_TYPES.find(t => t.id === iid)?.name || iid).join(', ');
            const description = `${repair.device} — ${issueNames}`;
            const redirectUrl = `${window.location.origin}/repair/${repair.id}?square_qr_success=1`;

            const { data: fnData, error: fnError } = await supabase.functions.invoke('create-square-payment-link', {
                body: {
                    repair_id: repair.id,
                    amount: chargeAmount,
                    tip_amount: chargeTip,
                    redirect_url: redirectUrl,
                    description,
                },
            });
            if (fnError) {
                let errorMessage = fnError.message || 'Payment service error';
                try {
                    const body = await fnError.context?.json();
                    if (body?.details) errorMessage = body.details;
                    else if (body?.error) errorMessage = body.error;
                } catch {}
                throw new Error(errorMessage);
            }
            if (!fnData?.url) throw new Error('No payment URL returned.');

            setSquarePaymentUrl(fnData.url);
            setSquarePhase('ready');
        } catch (err) {
            console.error('Square QR error:', err);
            setPaymentError(err.message || 'Failed to create payment link.');
            setSquarePhase('idle');
        }
        setPaymentProcessing(false);
    };

    // Square Tap to Pay: deep-link into the Square POS app with the correct amount
    // cashPortion: amount already collected in cash (split payment), 0 for full card payment
    const handleSquareTapPay = (cashPortion = 0) => {
        setPaymentError('');
        const { grandTotal } = computeTotal();
        const totalDue = grandTotal + tipAmount;
        const chargeAmount = cashPortion > 0 ? totalDue - cashPortion : totalDue;
        const totalCents = Math.round(chargeAmount * 100);
        const issueNames = issues.map(iid => REPAIR_TYPES.find(t => t.id === iid)?.name || iid).join(', ');
        const callbackUrl = `${window.location.origin}/repair/${repair.id}?square_return=1`;

        const squareAppId = import.meta.env.VITE_SQUARE_APP_ID;
        if (!squareAppId) {
            setPaymentError('Square App ID not configured. Add VITE_SQUARE_APP_ID to your .env file.');
            return;
        }

        if (cashPortion > 0) {
            sessionStorage.setItem(`split_cash_${repair.id}`, cashPortion.toString());
        }

        const payload = {
            amount_money: { amount: totalCents, currency_code: 'USD' },
            callback_url: callbackUrl,
            client_id: squareAppId,
            version: '1.3',
            notes: `${repair.device} — ${issueNames}`,
            options: { supported_tender_types: ['CREDIT_CARD', 'CASH', 'OTHER'] },
        };

        const encodedPayload = btoa(JSON.stringify(payload));
        window.location.href = `square-commerce-v1://payment/create?data=${encodedPayload}`;
        setSquarePhase('waiting');
    };

    // Handle Square return callbacks on page load
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        // Square POS deep-link return (Tap to Pay)
        const squareReturn = urlParams.get('square_return');
        const squareStatus = urlParams.get('status');
        if (squareReturn === '1') {
            window.history.replaceState({}, '', window.location.pathname);
            if (squareStatus === 'ok') {
                const splitCash = parseFloat(sessionStorage.getItem(`split_cash_${id}`) || '0');
                sessionStorage.removeItem(`split_cash_${id}`);
                const paidAt = new Date().toISOString();
                supabase
                    .from('repairs')
                    .update({
                        payment_status: 'completed',
                        payment_method: splitCash > 0 ? 'split' : 'square',
                        status: REPAIR_STATUS.COMPLETE,
                        paid_at: paidAt,
                        updated_at: paidAt,
                    })
                    .eq('id', id)
                    .then(async ({ error }) => {
                        if (!error) {
                            // Fetch customer email and send invoice
                            const { data: repairData } = await supabase
                                .from('repairs')
                                .select('*, customers(full_name, email)')
                                .eq('id', id)
                                .single();
                            if (repairData?.customers?.email) {
                                supabase.functions.invoke('send-repair-email', {
                                    body: {
                                        email_type: 'invoice_ready',
                                        customer_email: repairData.customers.email,
                                        repair_id: id,
                                        customer_name: repairData.customers.full_name || 'Customer',
                                        device: repairData.device,
                                        issues: repairData.issues,
                                        total_estimate: repairData.total_estimate,
                                        tip_amount: repairData.tip_amount || 0,
                                        payment_method: 'square',
                                        paid_at: paidAt,
                                    },
                                }).catch((err) => console.error('Invoice email error:', err));
                            }
                            navigate('/queue');
                        }
                    });
            }
            // If status !== 'ok', the modal is gone (page reloaded) — user can try again
        }

        // Square QR code payment link success redirect
        const squareQrSuccess = urlParams.get('square_qr_success');
        if (squareQrSuccess === '1') {
            window.history.replaceState({}, '', window.location.pathname);
            const splitCash = parseFloat(sessionStorage.getItem(`split_cash_${id}`) || '0');
            sessionStorage.removeItem(`split_cash_${id}`);
            const paidAt = new Date().toISOString();
            supabase
                .from('repairs')
                .update({
                    payment_status: 'completed',
                    payment_method: splitCash > 0 ? 'split' : 'square',
                    status: REPAIR_STATUS.COMPLETE,
                    paid_at: paidAt,
                    updated_at: paidAt,
                })
                .eq('id', id)
                .then(async ({ error }) => {
                    if (!error) {
                        // Fetch customer email and send invoice
                        const { data: repairData } = await supabase
                            .from('repairs')
                            .select('*, customers(full_name, email)')
                            .eq('id', id)
                            .single();
                        if (repairData?.customers?.email) {
                            supabase.functions.invoke('send-repair-email', {
                                body: {
                                    email_type: 'invoice_ready',
                                    customer_email: repairData.customers.email,
                                    repair_id: id,
                                    customer_name: repairData.customers.full_name || 'Customer',
                                    device: repairData.device,
                                    issues: repairData.issues,
                                    total_estimate: repairData.total_estimate,
                                    tip_amount: repairData.tip_amount || 0,
                                    payment_method: 'square',
                                    paid_at: paidAt,
                                },
                            }).catch((err) => console.error('Invoice email error:', err));
                        }
                        navigate('/queue');
                    }
                });
        }
    }, [id]);

    // When QR payment completes (Realtime fires on the waiting tab),
    // auto-advance to the completion signature step
    useEffect(() => {
        if (
            repair?.payment_status === 'completed' &&
            showPaymentModal &&
            paymentMethod === 'square-qr' &&
            paymentModalStep === 'payment'
        ) {
            setPaymentModalStep('signature');
        }
    }, [repair?.payment_status]);

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
                                <span>✓</span> Paid {repair.payment_method === 'cash' ? 'in Cash' : repair.payment_method === 'split' ? 'via Cash + Card' : repair.payment_method === 'square' ? 'via Square' : 'via Card'}
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
                                onClick={() => {
                                    setTipAmount(0);
                                    setPaymentModalStep('tip');
                                    setPaymentMethod(null);
                                    setPaymentError('');
                                    setSquarePaymentUrl(null);
                                    setSquarePhase('idle');
                                    setCashReceived('');
                                    setShowPaymentModal(true);
                                }}
                            >
                                <span className="payment-actions__icon">💳</span>
                                <span>Collect Payment</span>
                            </button>
                        )}
                    </div>

                    {/* ── Payment Wizard Modal (tip → method → signature) ── */}
                    {showPaymentModal && (
                        <div
                            className="confirm-modal-overlay"
                            onClick={() => {
                                // Cannot dismiss during processing or on the final signature step
                                if (paymentProcessing || squarePhase === 'loading' || paymentModalStep === 'signature') return;
                                closePaymentModal();
                            }}
                        >
                            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>

                                {/* ── Step 1: Tip selection (auto-advances on selection) ── */}
                                {paymentModalStep === 'tip' && (() => {
                                    const { grandTotal } = computeTotal();
                                    const advance = (amount) => {
                                        setTipAmount(amount);
                                        setPaymentModalStep('payment');
                                    };
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
                                {paymentModalStep === 'payment' && paymentMethod === null && (() => {
                                    const { grandTotal } = computeTotal();
                                    const amountDue = Math.round((grandTotal + tipAmount) * 100) / 100;
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">💳</div>
                                            <h3 className="confirm-modal__title">How would you like to pay?</h3>
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
                                                    <span>Amount Due</span>
                                                    <span>${amountDue.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="payment-actions" style={{ flexDirection: 'column' }}>
                                                <button className="payment-actions__btn payment-actions__btn--cash" onClick={() => setPaymentMethod('cash')}>
                                                    <span className="payment-actions__icon">💵</span>
                                                    <span>Cash</span>
                                                </button>
                                                <button className="payment-actions__btn payment-actions__btn--card" onClick={() => {
                                                    setPaymentMethod('square-qr');
                                                    handleSquareQRPayment();
                                                }}>
                                                    <span className="payment-actions__icon">📱</span>
                                                    <span>QR Code — Customer Scans</span>
                                                </button>
                                                <button className="payment-actions__btn payment-actions__btn--card" onClick={() => {
                                                    setPaymentMethod('square-tap');
                                                    handleSquareTapPay();
                                                }}>
                                                    <span className="payment-actions__icon">📲</span>
                                                    <span>Tap to Pay — In-Person NFC</span>
                                                </button>
                                            </div>
                                            <div className="confirm-modal__actions" style={{ marginTop: 8 }}>
                                                <button className="guru-btn guru-btn--ghost" onClick={() => setPaymentModalStep('tip')}>← Back</button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2b: Cash — enter received amount + show change ── */}
                                {paymentModalStep === 'payment' && paymentMethod === 'cash' && (() => {
                                    const { grandTotal } = computeTotal();
                                    // Round to cents so the displayed total matches the comparison
                                    const amountDue = Math.round((grandTotal + tipAmount) * 100) / 100;
                                    const cashNum = Math.round((parseFloat(cashReceived) || 0) * 100) / 100;
                                    const changeDue = cashNum - amountDue;
                                    const hasEnough = cashNum >= amountDue;
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">💵</div>
                                            <h3 className="confirm-modal__title">Cash Payment</h3>
                                            <div className="payment-modal__summary">
                                                {tipAmount > 0 && (
                                                    <div className="payment-modal__row">
                                                        <span>Tip</span>
                                                        <span>${tipAmount.toFixed(2)}</span>
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
                                                        value={cashReceived}
                                                        autoFocus
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            const parts = val.split('.');
                                                            setCashReceived(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val);
                                                        }}
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
                                            {paymentError && <div className="payment-modal__error">{paymentError}</div>}

                                            {/* Split payment — show when partial cash entered */}
                                            {cashNum > 0 && !hasEnough && (
                                                <div style={{ margin: 'var(--space-3) 0', textAlign: 'left' }}>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--dark-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
                                                        Charge remaining ${(amountDue - cashNum).toFixed(2)} to card
                                                    </p>
                                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                        <button
                                                            className="payment-actions__btn payment-actions__btn--card"
                                                            style={{ flex: 1, padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}
                                                            onClick={() => {
                                                                const cashPortion = cashNum;
                                                                setSplitCashAmount(cashPortion);
                                                                setPaymentMethod('square-qr');
                                                                handleSquareQRPayment(cashPortion);
                                                            }}
                                                            disabled={paymentProcessing}
                                                        >
                                                            📱 QR Code
                                                        </button>
                                                        <button
                                                            className="payment-actions__btn payment-actions__btn--card"
                                                            style={{ flex: 1, padding: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}
                                                            onClick={() => {
                                                                const cashPortion = cashNum;
                                                                setSplitCashAmount(cashPortion);
                                                                setPaymentMethod('square-tap');
                                                                handleSquareTapPay(cashPortion);
                                                            }}
                                                            disabled={paymentProcessing}
                                                        >
                                                            📲 Tap to Pay
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="confirm-modal__actions">
                                                <button className="guru-btn guru-btn--ghost" onClick={() => { setPaymentMethod(null); setCashReceived(''); }} disabled={paymentProcessing}>← Back</button>
                                                <button className="guru-btn guru-btn--primary" onClick={handleCashPayment} disabled={paymentProcessing || !hasEnough || cashNum === 0}>
                                                    {paymentProcessing ? 'Processing...' : 'Confirm Cash Received'}
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2c: Square QR Code — customer scans on their phone ── */}
                                {paymentModalStep === 'payment' && paymentMethod === 'square-qr' && (() => {
                                    const { grandTotal } = computeTotal();
                                    return (
                                        <>
                                            <div className="confirm-modal__icon">
                                                {squarePhase === 'waiting' ? '⏳' : '📱'}
                                            </div>
                                            <h3 className="confirm-modal__title">
                                                {squarePhase === 'loading' && 'Creating Payment Link...'}
                                                {squarePhase === 'ready' && 'Customer Scans to Pay'}
                                                {squarePhase === 'waiting' && 'Waiting for Payment...'}
                                            </h3>

                                            {squarePhase === 'loading' && (
                                                <div className="stripe-loading" style={{ margin: '24px 0' }}>
                                                    Setting up secure payment...
                                                </div>
                                            )}

                                            {squarePhase === 'ready' && squarePaymentUrl && (
                                                <>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 4, textAlign: 'center' }}>
                                                        {splitCashAmount > 0 ? (
                                                            <>
                                                                Charging: <strong style={{ color: 'var(--text-primary)' }}>${(grandTotal + tipAmount - splitCashAmount).toFixed(2)}</strong>
                                                                <span style={{ display: 'block', fontSize: '0.8rem', marginTop: 2 }}>${splitCashAmount.toFixed(2)} collected in cash</span>
                                                            </>
                                                        ) : (
                                                            <>Total: <strong style={{ color: 'var(--text-primary)' }}>${(grandTotal + tipAmount).toFixed(2)}</strong></>
                                                        )}
                                                    </p>
                                                    <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                                                            Have the customer scan with their phone camera
                                                        </p>
                                                        <div style={{ display: 'inline-block', background: '#fff', padding: 10, borderRadius: 12 }}>
                                                            <img
                                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(squarePaymentUrl)}&bgcolor=ffffff&color=000000`}
                                                                alt="Scan to pay"
                                                                width={200}
                                                                height={200}
                                                                style={{ display: 'block', borderRadius: 6 }}
                                                            />
                                                        </div>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                                                            Apple Pay · Google Pay · Card
                                                        </p>
                                                    </div>
                                                    <button
                                                        className="guru-btn guru-btn--primary guru-btn--full"
                                                        style={{ marginTop: 4 }}
                                                        onClick={() => {
                                                            window.open(squarePaymentUrl, '_blank');
                                                            setSquarePhase('waiting');
                                                        }}
                                                    >
                                                        Or Open Link on This Device
                                                    </button>
                                                </>
                                            )}

                                            {squarePhase === 'waiting' && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '20px 0', lineHeight: 1.6 }}>
                                                    Waiting for the customer to complete payment.<br />
                                                    This screen will update automatically once paid.
                                                </p>
                                            )}

                                            {paymentError && <div className="payment-modal__error">{paymentError}</div>}

                                            <div className="confirm-modal__actions">
                                                <button
                                                    className="guru-btn guru-btn--ghost"
                                                    onClick={() => { setPaymentMethod(null); setSquarePaymentUrl(null); setSquarePhase('idle'); }}
                                                    disabled={squarePhase === 'loading'}
                                                >
                                                    ← Back
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}

                                {/* ── Step 2d: Square Tap to Pay — opens Square POS app via deep link ── */}
                                {paymentModalStep === 'payment' && paymentMethod === 'square-tap' && (
                                    <>
                                        <div className="confirm-modal__icon">
                                            {squarePhase === 'waiting' ? '📲' : '📲'}
                                        </div>
                                        <h3 className="confirm-modal__title">
                                            {squarePhase === 'waiting' ? 'Square POS Opening...' : 'Tap to Pay'}
                                        </h3>

                                        {squarePhase === 'waiting' ? (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0', lineHeight: 1.6 }}>
                                                Complete the payment in the Square POS app.<br />
                                                You'll be returned here automatically when done.<br /><br />
                                                <span style={{ fontSize: '0.8rem' }}>If Square POS didn't open, make sure the app is installed and tap the button below.</span>
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0', lineHeight: 1.6 }}>
                                                Tap the button below to open Square POS.<br />
                                                Have the customer tap their card or phone to yours.
                                            </p>
                                        )}

                                        {paymentError && <div className="payment-modal__error">{paymentError}</div>}

                                        <div className="confirm-modal__actions">
                                            <button
                                                className="guru-btn guru-btn--ghost"
                                                onClick={() => { setPaymentMethod(null); setSquarePhase('idle'); }}
                                            >
                                                ← Back
                                            </button>
                                            <button
                                                className="guru-btn guru-btn--primary"
                                                onClick={handleSquareTapPay}
                                            >
                                                {squarePhase === 'waiting' ? 'Try Again' : 'Open Square POS'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* ── Step 3: Completion signature ── */}
                                {paymentModalStep === 'signature' && (
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

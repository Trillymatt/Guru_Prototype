import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW } from '@shared/constants';
import { supabase } from '@shared/supabase';
import TechNav from '../components/TechNav';

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
    const canvasRef = useRef(null);
    const sigPadRef = useRef(null);

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

    const clearSignature = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
        }
    };

    const saveSignature = async () => {
        if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
            const signatureData = sigPadRef.current.toDataURL();

            // Upload signature to Supabase storage (if bucket exists)
            try {
                const blob = await (await fetch(signatureData)).blob();
                const fileName = `signatures/${id}_${Date.now()}.png`;
                await supabase.storage
                    .from('repair-photos')
                    .upload(fileName, blob, { contentType: 'image/png' });
            } catch (err) {
                console.log('Signature storage skipped (bucket may not exist):', err.message);
            }

            setSigned(true);
            setShowSignature(false);
        }
    };

    // Advance repair status in Supabase
    const advanceStatus = async () => {
        if (!repair) return;
        const currentIndex = REPAIR_STATUS_FLOW.indexOf(repair.status);
        const nextIndex = currentIndex + 1;

        if (nextIndex >= REPAIR_STATUS_FLOW.length) return;

        const nextStatus = REPAIR_STATUS_FLOW[nextIndex];
        setUpdating(true);

        // If claiming a pending job, also assign the technician
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
        }

        setUpdating(false);
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

    const currentStatusIndex = REPAIR_STATUS_FLOW.indexOf(repair.status);
    const customerName = repair.customers?.full_name || 'Unknown';
    const customerPhone = repair.customers?.phone || '—';
    const customerEmail = repair.customers?.email || '—';
    const issues = Array.isArray(repair.issues) ? repair.issues : [];
    const partsTier = typeof repair.parts_tier === 'object' ? JSON.stringify(repair.parts_tier) : repair.parts_tier || '—';

    return (
        <>
            {/* Technician Nav */}
            <TechNav />

            <div className="repair-detail">
                <div className="guru-container">
                    <div className="repair-detail__header">
                        <Link to="/queue" className="repair-detail__back">← Back to Queue</Link>
                        <span className={`guru-badge ${repair.status === REPAIR_STATUS.PENDING ? 'guru-badge--warning' :
                            repair.status === REPAIR_STATUS.COMPLETE ? 'guru-badge--success' :
                                'guru-badge--purple'
                            }`}>
                            {REPAIR_STATUS_LABELS[repair.status] || repair.status}
                        </span>
                    </div>

                    <div className="repair-detail__grid">
                        {/* Left Column */}
                        <div>
                            {/* Device & Issues */}
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Repair Details</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Device</span>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>{repair.device}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Issues</span>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                            {issues.map((issue) => (
                                                <span key={issue} className="guru-badge guru-badge--purple">{issue}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Parts Tier</span>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 4 }}>{partsTier}</div>
                                    </div>
                                    {repair.notes && (
                                        <div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Notes</span>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.6 }}>{repair.notes}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Customer Information</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                                        <span style={{ fontWeight: 600 }}>{customerName}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Phone</span>
                                        <span style={{ fontWeight: 600 }}>{customerPhone}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                                        <span style={{ fontWeight: 600 }}>{customerEmail}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Location</span>
                                        <span style={{ fontWeight: 600 }}>{repair.address}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signature / Legal Docs */}
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Legal Documentation</h2>
                                {signed ? (
                                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--guru-success)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>Customer has signed the agreement</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                            Signed at {new Date().toLocaleString()}
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

                        {/* Right Column — Status & Actions */}
                        <div>
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Repair Status</h2>
                                <div className="status-stepper">
                                    {REPAIR_STATUS_FLOW.map((status, i) => {
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
                                        onClick={advanceStatus}
                                        disabled={updating}
                                    >
                                        {updating
                                            ? 'Updating...'
                                            : repair.status === REPAIR_STATUS.PENDING
                                                ? 'Claim This Job'
                                                : `Advance to: ${REPAIR_STATUS_LABELS[REPAIR_STATUS_FLOW[currentStatusIndex + 1]] || 'Done'}`
                                        }
                                    </button>
                                )}
                            </div>

                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Schedule</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                                        <span style={{ fontWeight: 600 }}>{repair.schedule_date}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Time</span>
                                        <span style={{ fontWeight: 600 }}>{repair.schedule_time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Pricing</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Service Fee</span>
                                        <span style={{ fontWeight: 600 }}>${repair.service_fee}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Estimated Total</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--guru-purple-600)' }}>${repair.total_estimate}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

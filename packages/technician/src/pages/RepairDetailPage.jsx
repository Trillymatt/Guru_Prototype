import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { REPAIR_STATUS, REPAIR_STATUS_LABELS, REPAIR_STATUS_FLOW, REPAIR_TYPES, PARTS_TIERS, SAMPLE_PRICING, SERVICE_FEE, TAX_RATE, getRepairStatusFlow } from '@shared/constants';
import { supabase } from '@shared/supabase';
import RepairChat from '@shared/RepairChat';
import TechNav from '../components/TechNav';
import '@shared/repair-chat.css';
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

    // Photo state
    const [photos, setPhotos] = useState([]);
    const [photosLoading, setPhotosLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [photoType, setPhotoType] = useState('before');
    const [photoError, setPhotoError] = useState('');
    const [expandedPhoto, setExpandedPhoto] = useState(null);
    const fileInputRef = useRef(null);

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
                // Generate signed URLs for each photo
                const photosWithUrls = await Promise.all(
                    data.map(async (photo) => {
                        const { data: urlData } = await supabase.storage
                            .from('repair-photos')
                            .createSignedUrl(photo.file_path, 3600); // 1 hour expiry
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

        // Validate file type
        const validTypes = ['image/jpeg', 'image/heic', 'image/heif'];
        const validExtensions = ['.jpg', '.jpeg', '.heic', '.heif'];
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            setPhotoError('Only JPEG and HEIC files are accepted.');
            return;
        }

        // Validate file size (max 20MB)
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

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('repair-photos')
                .upload(filePath, file, { contentType: file.type || 'image/jpeg' });

            if (uploadError) throw uploadError;

            // Insert metadata record
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

            // Get signed URL for the new photo
            const { data: urlData } = await supabase.storage
                .from('repair-photos')
                .createSignedUrl(filePath, 3600);

            setPhotos(prev => [...prev, { ...photoRecord, signedUrl: urlData?.signedUrl || null }]);
        } catch (err) {
            console.error('Photo upload failed:', err);
            setPhotoError(err.message || 'Upload failed. Please try again.');
        }

        setUploading(false);
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Delete photo handler
    const handlePhotoDelete = async (photo) => {
        try {
            // Delete from storage
            await supabase.storage
                .from('repair-photos')
                .remove([photo.file_path]);

            // Delete metadata record
            await supabase
                .from('repair_photos')
                .delete()
                .eq('id', photo.id);

            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (expandedPhoto?.id === photo.id) setExpandedPhoto(null);
        } catch (err) {
            console.error('Photo delete failed:', err);
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

    // Get the correct status flow for this repair
    const statusFlow = repair ? getRepairStatusFlow(repair.parts_in_stock) : REPAIR_STATUS_FLOW;

    // Advance repair status in Supabase
    const advanceStatus = async () => {
        if (!repair) return;
        const currentIndex = statusFlow.indexOf(repair.status);
        const nextIndex = currentIndex + 1;

        if (nextIndex >= statusFlow.length) return;

        const nextStatus = statusFlow[nextIndex];
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

    const currentStatusIndex = statusFlow.indexOf(repair.status);
    const customerName = repair.customers?.full_name || 'Unknown';
    const customerPhone = repair.customers?.phone || '—';
    const customerEmail = repair.customers?.email || '—';
    const issues = Array.isArray(repair.issues) ? repair.issues : [];

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
                                <div className="repair-detail__info-stack">
                                    <div>
                                        <span className="repair-detail__info-label">Device</span>
                                        <div className="repair-detail__info-value">{repair.device}</div>
                                    </div>
                                    <div>
                                        <span className="repair-detail__info-label">Issues</span>
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

                            {/* Repair Photos (Tech-Only) */}
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Repair Photos</h2>
                                <p className="repair-photos__note">
                                    For technician records only — not visible to customers.
                                </p>

                                {/* Upload Controls */}
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

                                {/* Before Photos */}
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

                                {/* After Photos */}
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

                                {/* Empty state */}
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

                            {/* Signature / Legal Docs */}
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

                        {/* Right Column — Status & Actions */}
                        <div>
                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Repair Status</h2>

                                {/* Inventory status indicator */}
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
                                        onClick={advanceStatus}
                                        disabled={updating}
                                    >
                                        {updating
                                            ? 'Updating...'
                                            : repair.status === REPAIR_STATUS.PENDING
                                                ? 'Claim This Job'
                                                : `Advance to: ${REPAIR_STATUS_LABELS[statusFlow[currentStatusIndex + 1]] || 'Done'}`
                                        }
                                    </button>
                                )}
                            </div>

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

                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Schedule</h2>
                                <div>
                                    <div className="repair-detail__row">
                                        <span className="repair-detail__row-label">Date</span>
                                        <span className="repair-detail__row-value">{repair.schedule_date ? repair.schedule_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : '—'}</span>
                                    </div>
                                    <div className="repair-detail__row">
                                        <span className="repair-detail__row-label">Time</span>
                                        <span className="repair-detail__row-value">{repair.schedule_time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="repair-detail__section">
                                <h2 className="repair-detail__section-title">Pricing Breakdown</h2>
                                <div className="pricing-breakdown">
                                    {/* Individual repair line items */}
                                    {issues.map((issueId) => {
                                        const type = REPAIR_TYPES.find((t) => t.id === issueId);
                                        const tierObj = typeof repair.parts_tier === 'object' ? repair.parts_tier : {};
                                        const tierId = tierObj[issueId] || 'premium';
                                        const tier = PARTS_TIERS.find((t) => t.id === tierId);
                                        const price = SAMPLE_PRICING[issueId]?.[tierId] || 0;
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

                                    <div className="pricing-breakdown__divider"></div>

                                    {/* Subtotal */}
                                    <div className="pricing-breakdown__line">
                                        <span className="pricing-breakdown__label">Subtotal</span>
                                        <span className="pricing-breakdown__amount">${repair.total_estimate}</span>
                                    </div>

                                    {/* Tax */}
                                    <div className="pricing-breakdown__line">
                                        <span className="pricing-breakdown__label">Sales Tax (8.25%)</span>
                                        <span className="pricing-breakdown__amount">
                                            ${(repair.total_estimate * TAX_RATE).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="pricing-breakdown__divider pricing-breakdown__divider--strong"></div>

                                    {/* Grand Total */}
                                    <div className="pricing-breakdown__total">
                                        <span>Total Due</span>
                                        <span className="pricing-breakdown__total-amount">
                                            ${(repair.total_estimate * (1 + TAX_RATE)).toFixed(2)}
                                        </span>
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

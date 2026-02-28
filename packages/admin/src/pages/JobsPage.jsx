import React, { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '../supabaseAdmin';

const STATUSES = [
    'pending', 'confirmed', 'parts_ordered', 'parts_received',
    'scheduled', 'en_route', 'arrived', 'in_progress', 'complete', 'cancelled'
];

const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    parts_ordered: 'Parts Ordered',
    parts_received: 'Parts Received',
    scheduled: 'Scheduled',
    en_route: 'En Route',
    arrived: 'Arrived',
    in_progress: 'In Progress',
    complete: 'Complete',
    cancelled: 'Cancelled',
};

const STATUS_COLORS = {
    pending: '#F59E0B',
    confirmed: '#3B82F6',
    parts_ordered: '#8B5CF6',
    parts_received: '#6366F1',
    scheduled: '#06B6D4',
    en_route: '#F97316',
    arrived: '#10B981',
    in_progress: '#7C3AED',
    complete: '#22C55E',
    cancelled: '#EF4444',
};

const REPAIR_TYPES = [
    { id: 'screen', name: 'Screen Replacement' },
    { id: 'battery', name: 'Battery Replacement' },
    { id: 'back-glass', name: 'Back Glass' },
    { id: 'camera-rear', name: 'Rear Camera' },
    { id: 'camera-front', name: 'Front Camera' },
];

const TIERS = ['economy', 'premium', 'genuine'];

const EMPTY_JOB = {
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    device: '',
    repair_type: '',
    parts_tier: 'premium',
    status: 'pending',
    notes: '',
    price_charged: '',
    estimated_completion: '',
};

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [formData, setFormData] = useState(EMPTY_JOB);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    async function fetchJobs() {
        if (!supabaseAdmin) { setLoading(false); return; }
        setLoading(true);
        const { data, error } = await supabaseAdmin
            .from('repairs')
            .select('*, customers(full_name, phone, email)')
            .order('created_at', { ascending: false });

        if (!error) {
            setJobs(data || []);
        }
        setLoading(false);
    }

    const filteredJobs = useMemo(() => {
        let result = jobs;
        if (statusFilter !== 'all') {
            result = result.filter(j => j.status === statusFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(j => {
                const name = j.customers?.full_name || '';
                const phone = j.customers?.phone || '';
                const device = j.device || '';
                return name.toLowerCase().includes(q) ||
                    phone.includes(q) ||
                    device.toLowerCase().includes(q);
            });
        }
        return result;
    }, [jobs, statusFilter, searchQuery]);

    const statusCounts = useMemo(() => {
        const counts = { all: jobs.length };
        STATUSES.forEach(s => { counts[s] = jobs.filter(j => j.status === s).length; });
        return counts;
    }, [jobs]);

    function openCreateModal() {
        setEditingJob(null);
        setFormData(EMPTY_JOB);
        setShowModal(true);
    }

    function openEditModal(job) {
        setEditingJob(job);
        const repairType = Array.isArray(job.issues) && job.issues.length > 0
            ? (typeof job.issues[0] === 'string' ? job.issues[0] : job.issues[0]?.id || '')
            : '';
        const tier = typeof job.parts_tier === 'object' && job.parts_tier
            ? job.parts_tier.id || 'premium'
            : job.parts_tier || 'premium';
        setFormData({
            customer_name: job.customers?.full_name || '',
            customer_phone: job.customers?.phone || '',
            customer_email: job.customers?.email || '',
            device: job.device || '',
            repair_type: repairType,
            parts_tier: tier,
            status: job.status,
            notes: job.notes || '',
            price_charged: job.price_charged || '',
            estimated_completion: job.estimated_completion || '',
        });
        setShowModal(true);
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);

        const repairData = {
            device: formData.device,
            issues: [{ id: formData.repair_type, name: REPAIR_TYPES.find(r => r.id === formData.repair_type)?.name || formData.repair_type }],
            parts_tier: { id: formData.parts_tier, name: TIERS.includes(formData.parts_tier) ? formData.parts_tier.charAt(0).toUpperCase() + formData.parts_tier.slice(1) : formData.parts_tier },
            status: formData.status,
            notes: formData.notes || null,
            price_charged: formData.price_charged ? parseFloat(formData.price_charged) : null,
            estimated_completion: formData.estimated_completion || null,
        };

        if (editingJob) {
            // Update existing job
            await supabaseAdmin
                .from('repairs')
                .update(repairData)
                .eq('id', editingJob.id);

            // Update customer info if changed
            if (editingJob.customer_id) {
                await supabaseAdmin
                    .from('customers')
                    .update({
                        full_name: formData.customer_name,
                        phone: formData.customer_phone,
                        email: formData.customer_email,
                    })
                    .eq('id', editingJob.customer_id);
            }
        } else {
            // Create new job — first find or create customer
            let customerId = null;

            if (formData.customer_email) {
                const { data: existing } = await supabaseAdmin
                    .from('customers')
                    .select('id')
                    .eq('email', formData.customer_email)
                    .limit(1)
                    .maybeSingle();

                if (existing) {
                    customerId = existing.id;
                    await supabaseAdmin
                        .from('customers')
                        .update({
                            full_name: formData.customer_name,
                            phone: formData.customer_phone,
                        })
                        .eq('id', customerId);
                } else {
                    const { data: newCustomer } = await supabaseAdmin
                        .from('customers')
                        .insert({
                            email: formData.customer_email,
                            full_name: formData.customer_name,
                            phone: formData.customer_phone,
                        })
                        .select('id')
                        .single();
                    customerId = newCustomer?.id || null;
                }
            }

            await supabaseAdmin
                .from('repairs')
                .insert({
                    ...repairData,
                    customer_id: customerId,
                    service_fee: 29,
                    total_estimate: formData.price_charged ? parseFloat(formData.price_charged) : null,
                });
        }

        setSaving(false);
        setShowModal(false);
        fetchJobs();
    }

    async function handleDelete(job) {
        if (!window.confirm(`Delete this repair job for ${job.customers?.full_name || 'Unknown'}?`)) return;
        await supabaseAdmin.from('repairs').delete().eq('id', job.id);
        fetchJobs();
    }

    async function handleQuickStatus(jobId, newStatus) {
        await supabaseAdmin
            .from('repairs')
            .update({ status: newStatus })
            .eq('id', jobId);
        fetchJobs();
    }

    function getRepairTypeName(job) {
        if (!Array.isArray(job.issues) || job.issues.length === 0) return '—';
        const issue = job.issues[0];
        return typeof issue === 'string' ? issue : issue?.name || issue?.id || '—';
    }

    function getTierName(job) {
        if (!job.parts_tier) return '—';
        if (typeof job.parts_tier === 'object') return job.parts_tier.name || job.parts_tier.id || '—';
        return job.parts_tier;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatCurrency(amount) {
        if (amount == null) return '—';
        return `$${parseFloat(amount).toFixed(2)}`;
    }

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Jobs</h1>
                    <p className="admin-page__subtitle">{jobs.length} total repair jobs</p>
                </div>
                <button onClick={openCreateModal} className="admin-btn admin-btn--primary">
                    + New Job
                </button>
            </div>

            {/* Filters */}
            <div className="admin-filters">
                <div className="admin-filters__tabs">
                    <button
                        className={`admin-filters__tab ${statusFilter === 'all' ? 'admin-filters__tab--active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        All ({statusCounts.all})
                    </button>
                    {STATUSES.filter(s => statusCounts[s] > 0).map(s => (
                        <button
                            key={s}
                            className={`admin-filters__tab ${statusFilter === s ? 'admin-filters__tab--active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {STATUS_LABELS[s]} ({statusCounts[s]})
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder="Search by name, phone, or device..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-filters__search"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="admin-loading">Loading jobs...</div>
            ) : filteredJobs.length === 0 ? (
                <div className="admin-empty">No jobs found</div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Device</th>
                                <th>Repair</th>
                                <th>Tier</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Created</th>
                                <th>Est. Completion</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredJobs.map(job => (
                                <tr key={job.id}>
                                    <td>
                                        <div className="admin-table__customer">
                                            <span className="admin-table__name">{job.customers?.full_name || 'Unknown'}</span>
                                            <span className="admin-table__phone">{job.customers?.phone || ''}</span>
                                        </div>
                                    </td>
                                    <td>{job.device || '—'}</td>
                                    <td>{getRepairTypeName(job)}</td>
                                    <td>
                                        <span className={`admin-tier admin-tier--${typeof job.parts_tier === 'object' ? job.parts_tier?.id : job.parts_tier}`}>
                                            {getTierName(job)}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            value={job.status}
                                            onChange={(e) => handleQuickStatus(job.id, e.target.value)}
                                            className="admin-status-select"
                                            style={{ borderColor: STATUS_COLORS[job.status] }}
                                        >
                                            {STATUSES.map(s => (
                                                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>{formatCurrency(job.price_charged || job.total_estimate)}</td>
                                    <td>{formatDate(job.created_at)}</td>
                                    <td>{formatDate(job.estimated_completion)}</td>
                                    <td>
                                        <div className="admin-table__actions">
                                            <button onClick={() => openEditModal(job)} className="admin-btn-icon" title="Edit">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(job)} className="admin-btn-icon admin-btn-icon--danger" title="Delete">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="admin-modal-overlay" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-labelledby="job-modal-title">
                    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal__header">
                            <h2 id="job-modal-title">{editingJob ? 'Edit Job' : 'New Job'}</h2>
                            <button onClick={() => setShowModal(false)} className="admin-modal__close">&times;</button>
                        </div>
                        <form onSubmit={handleSave} className="admin-modal__form">
                            <div className="admin-form-grid">
                                <div className="admin-form-group">
                                    <label>Customer Name</label>
                                    <input
                                        type="text"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={formData.customer_phone}
                                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={formData.customer_email}
                                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Device Model</label>
                                    <input
                                        type="text"
                                        value={formData.device}
                                        onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                                        placeholder="e.g. iPhone 15 Pro"
                                        required
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Repair Type</label>
                                    <select
                                        value={formData.repair_type}
                                        onChange={(e) => setFormData({ ...formData, repair_type: e.target.value })}
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {REPAIR_TYPES.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label>Service Tier</label>
                                    <select
                                        value={formData.parts_tier}
                                        onChange={(e) => setFormData({ ...formData, parts_tier: e.target.value })}
                                    >
                                        <option value="economy">Economy</option>
                                        <option value="premium">Premium</option>
                                        <option value="genuine">Genuine Apple</option>
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {STATUSES.map(s => (
                                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="admin-form-group">
                                    <label>Price Charged ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price_charged}
                                        onChange={(e) => setFormData({ ...formData, price_charged: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="admin-form-group">
                                    <label>Est. Completion Date</label>
                                    <input
                                        type="date"
                                        value={formData.estimated_completion}
                                        onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="admin-form-group admin-form-group--full">
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Internal notes about this job..."
                                />
                            </div>
                            <div className="admin-modal__footer">
                                <button type="button" onClick={() => setShowModal(false)} className="admin-btn admin-btn--ghost">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="admin-btn admin-btn--primary">
                                    {saving ? 'Saving...' : editingJob ? 'Update Job' : 'Create Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

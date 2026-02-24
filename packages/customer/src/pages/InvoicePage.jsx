import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import {
    REPAIR_TYPES,
    PARTS_TIERS,
    SAMPLE_PRICING,
    SERVICE_FEE,
    TAX_RATE,
} from '@shared/constants';
import '../styles/invoice.css';

const PAYMENT_METHOD_LABELS = {
    cash: 'Cash',
    square: 'Square (Card / Tap to Pay)',
    split: 'Cash + Card (Split Payment)',
    stripe: 'Credit / Debit Card',
};

function formatCurrency(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function InvoicePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [repair, setRepair] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !id) return;

        async function fetchData() {
            const [repairRes, customerRes] = await Promise.all([
                supabase
                    .from('repairs')
                    .select('*')
                    .eq('id', id)
                    .eq('customer_id', user.id)
                    .single(),
                supabase
                    .from('customers')
                    .select('full_name')
                    .eq('id', user.id)
                    .single(),
            ]);

            if (repairRes.data) setRepair(repairRes.data);
            if (customerRes.data?.full_name) setCustomerName(customerRes.data.full_name);
            setLoading(false);
        }

        fetchData();
    }, [user, id]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="invoice-page">
                    <div className="guru-container guru-container--narrow">
                        <div className="invoice-loading">Loading invoice...</div>
                    </div>
                </div>
            </>
        );
    }

    if (!repair || repair.payment_status !== 'completed') {
        return (
            <>
                <Navbar />
                <div className="invoice-page">
                    <div className="guru-container guru-container--narrow">
                        <div className="invoice-error">
                            <h2>Invoice not available</h2>
                            <p>This invoice doesn't exist or payment has not been completed yet.</p>
                            <Link to="/dashboard" className="guru-btn guru-btn--primary" style={{ marginTop: 16 }}>
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Compute line items from stored issues + parts tiers
    const issues = Array.isArray(repair.issues) ? repair.issues : [];
    const lineItems = issues.map((issueId) => {
        const type = REPAIR_TYPES.find((t) => t.id === issueId);
        const tierKey = repair.parts_tier?.[issueId] || 'premium';
        const tier = PARTS_TIERS.find((t) => t.id === tierKey);
        const price = SAMPLE_PRICING[issueId]?.[tierKey] || 0;
        return { issueId, type, tier, price };
    });

    const partsTotal = lineItems.reduce((sum, item) => sum + item.price, 0);
    const serviceFee = Number(repair.service_fee) || SERVICE_FEE;
    const subtotal = partsTotal + serviceFee;
    const tax = subtotal * TAX_RATE;
    const tipAmount = Number(repair.tip_amount) || 0;
    // Use stored total_estimate as the authoritative pre-tip total
    const storedTotal = Number(repair.total_estimate) || 0;
    const grandTotal = storedTotal + tipAmount;

    const orderId = repair.id.slice(-8).toUpperCase();
    const paymentMethodLabel = PAYMENT_METHOD_LABELS[repair.payment_method] || repair.payment_method || 'Paid';

    return (
        <>
            <Navbar />
            <div className="invoice-page">
                <div className="guru-container guru-container--narrow">

                    <Link to={`/repair/${id}`} className="invoice-back">
                        ← Back to Repair Details
                    </Link>

                    {/* Action bar (hidden on print) */}
                    <div className="invoice-actions">
                        <button className="guru-btn guru-btn--primary" onClick={handlePrint}>
                            Print / Save as PDF
                        </button>
                    </div>

                    {/* Invoice document */}
                    <div className="invoice-doc">

                        {/* Header */}
                        <div className="invoice-header">
                            <div className="invoice-brand">
                                <div className="invoice-brand__name">GURU</div>
                                <div className="invoice-brand__tagline">Mobile Repair Solutions</div>
                            </div>
                            <div className="invoice-meta">
                                <div className="invoice-meta__title">Invoice</div>
                                <div className="invoice-meta__number">#{orderId}</div>
                                <div className="invoice-paid-badge">
                                    <span>✓</span> Paid
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="invoice-body">

                            {/* Bill to / Date row */}
                            <div className="invoice-info-row">
                                <div>
                                    <div className="invoice-info__label">Bill To</div>
                                    <div className="invoice-info__value">{customerName || 'Customer'}</div>
                                    {repair.address && (
                                        <div className="invoice-info__sub">{repair.address}</div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="invoice-info__label">Date Paid</div>
                                    <div className="invoice-info__value">{formatDate(repair.paid_at)}</div>
                                    {repair.schedule_date && (
                                        <div className="invoice-info__sub">
                                            Service: {repair.schedule_date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Device */}
                            <div style={{ marginBottom: 'var(--space-6)' }}>
                                <div className="invoice-section-title">Device</div>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--guru-black)' }}>
                                    {repair.device}
                                </div>
                            </div>

                            {/* Services line items */}
                            <div className="invoice-section-title">Services</div>
                            <table className="invoice-items">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map(({ issueId, type, tier, price }) => (
                                        <tr key={issueId}>
                                            <td>
                                                <span className="invoice-item__name">
                                                    {type?.icon} {type?.name || issueId}
                                                </span>
                                                {tier && (
                                                    <span className="invoice-tier-badge">{tier.name}</span>
                                                )}
                                            </td>
                                            <td>{formatCurrency(price)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td>
                                            <span className="invoice-item__name">🚗 On-site Service Fee</span>
                                        </td>
                                        <td>{formatCurrency(serviceFee)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="invoice-totals">
                                <div className="invoice-total-row">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="invoice-total-row">
                                    <span>Tax (8.25%)</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                {tipAmount > 0 && (
                                    <div className="invoice-total-row">
                                        <span>Tip</span>
                                        <span>{formatCurrency(tipAmount)}</span>
                                    </div>
                                )}
                                <div className="invoice-total-row invoice-total-row--grand">
                                    <span>Total Paid</span>
                                    <span>{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>

                            {/* Payment method */}
                            <div className="invoice-payment-note">
                                <span className="invoice-payment-note__icon">
                                    {repair.payment_method === 'cash' ? '💵' : '💳'}
                                </span>
                                <span>
                                    Payment received via{' '}
                                    <span className="invoice-payment-note__method">{paymentMethodLabel}</span>
                                    {repair.paid_at && (
                                        <> on {new Date(repair.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                    )}
                                </span>
                            </div>

                            {/* Footer */}
                            <div className="invoice-footer">
                                <div className="invoice-footer__brand">Guru Mobile Repair Solutions</div>
                                <div>support@gurumobilerepair.com</div>
                                <div style={{ marginTop: 8 }}>
                                    Thank you for choosing Guru. Your repair is covered by our standard parts warranty.
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

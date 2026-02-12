import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '@shared/supabase';
import { formatPhoneE164 } from '@shared/validation';
import {
    DEVICES,
    DEVICE_GENERATIONS,
    getDevicesByGeneration,
    REPAIR_TYPES,
    PARTS_TIERS,
    SAMPLE_PRICING,
    SERVICE_FEE,
} from '@shared/constants';
import '../styles/repair-quiz.css';

import { useRef } from 'react';

const STEPS = ['What needs fixing?', 'When & where?', 'Confirm & book'];

// Supported cities in the Dallas-Fort Worth metroplex
const SUPPORTED_CITIES = [
    'dallas', 'fort worth', 'plano', 'frisco', 'mckinney',
    'arlington', 'irving', 'garland', 'grand prairie', 'mesquite',
    'carrollton', 'denton', 'richardson', 'lewisville', 'allen',
    'flower mound', 'north richland hills', 'mansfield', 'rowlett',
    'euless', 'desoto', 'grapevine', 'bedford', 'cedar hill',
    'wylie', 'keller', 'coppell', 'haltom city', 'the colony',
    'southlake', 'colleyville', 'farmers branch', 'addison',
    'trophy club', 'prosper', 'celina', 'little elm', 'sachse',
    'murphy', 'highland park', 'university park', 'duncanville',
    'lancaster', 'watauga', 'hurst', 'benbrook', 'saginaw',
    'burleson', 'crowley', 'weatherford', 'cleburne', 'rockwall',
    'forney', 'heath', 'midlothian', 'waxahachie', 'ennis',
];

function isCitySupported(addressDisplay) {
    const lower = addressDisplay.toLowerCase();
    return SUPPORTED_CITIES.some(city => lower.includes(city));
}

// Address Search Component using OpenStreetMap Nominatim
const AddressSearch = ({ value, onChange, onServiceError }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    React.useEffect(() => {
        if (query === value) return;
        const timer = setTimeout(() => {
            if (query.length > 2) {
                setIsSearching(true);
                fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `format=json&q=${encodeURIComponent(query)}&countrycodes=us` +
                    `&addressdetails=1&limit=6&viewbox=-97.5,-96.5,33.4,32.5&bounded=0`
                )
                    .then(res => res.json())
                    .then(data => {
                        const formatted = data
                            .filter(r => r.address && (r.type === 'house' || r.type === 'residential' || r.class === 'place' || r.class === 'building' || r.class === 'highway' || r.address.road))
                            .map(r => ({
                                display: r.display_name,
                                city: r.address.city || r.address.town || r.address.village || r.address.hamlet || r.address.county || '',
                                state: r.address.state || '',
                            }));
                        setResults(formatted.length > 0 ? formatted : data.slice(0, 5).map(r => ({
                            display: r.display_name,
                            city: r.address?.city || r.address?.town || r.address?.village || r.address?.hamlet || r.address?.county || '',
                            state: r.address?.state || '',
                        })));
                        setIsSearching(false);
                    })
                    .catch(() => {
                        setResults([]);
                        setIsSearching(false);
                    });
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, value]);

    const handleSelect = (result) => {
        const shortDisplay = result.display.split(',').slice(0, 4).join(',');
        setQuery(shortDisplay);

        if (!isCitySupported(result.display)) {
            onChange('');
            if (onServiceError) onServiceError(result.city || 'that area');
        } else {
            onChange(shortDisplay);
            if (onServiceError) onServiceError(null);
        }
        setResults([]);
    };

    return (
        <div className="address-search-container">
            <input
                type="text"
                className="guru-input"
                placeholder="Start typing your address..."
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value === '') {
                        onChange('');
                        if (onServiceError) onServiceError(null);
                    }
                }}
            />
            {isSearching && <div className="address-searching">Searching addresses...</div>}
            {results.length > 0 && (
                <div className="address-results">
                    {results.map((r, i) => (
                        <button key={i} className="address-result-item" onClick={() => handleSelect(r)}>
                            📍 {r.display.split(',').slice(0, 3).join(',')}
                        </button>
                    ))}
                    <div className="address-api-note">Powered by OpenStreetMap</div>
                </div>
            )}
        </div>
    );
};

export default function RepairQuiz() {
    const [step, setStep] = useState(0);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [issueTiers, setIssueTiers] = useState({}); // { issueId: 'economy' | 'premium' | 'genuine' }
    const [activeGen, setActiveGen] = useState('17');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleAddress, setScheduleAddress] = useState('');
    const [serviceAreaError, setServiceAreaError] = useState(null);
    // Quality must be explicitly chosen by customer

    // Auth / Contact State
    const [contact, setContact] = useState({ name: '', email: '', phone: '' });
    // OTP is email-only for now
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [authError, setAuthError] = useState('');
    const otpRefs = useRef([]);

    const [confirmed, setConfirmed] = useState(false);
    const navigate = useNavigate();

    const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const toggleIssue = (id) => {
        setSelectedIssues((prev) => {
            const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            // Remove tier if deselecting
            if (prev.includes(id)) {
                setIssueTiers((t) => {
                    const copy = { ...t };
                    delete copy[id];
                    return copy;
                });
            }
            return next;
        });
    };

    const setTierForIssue = (issueId, tier) => {
        setIssueTiers((prev) => ({ ...prev, [issueId]: tier }));
    };

    const getIssuePrice = (issueId) => {
        const tier = issueTiers[issueId] || 'premium';
        return SAMPLE_PRICING[issueId]?.[tier] || 0;
    };

    const calculateTotal = () => {
        const partsTotal = selectedIssues.reduce((sum, id) => sum + getIssuePrice(id), 0);
        return partsTotal + SERVICE_FEE;
    };

    const isSoftwareOnly = selectedIssues.length === 1 && selectedIssues[0] === 'software';

    // Min date: 3 days from now
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const minDateStr = minDate.toISOString().split('T')[0];

    const timeSlots = [
        { id: 'morning', label: 'Morning', range: '8:00 AM – 12:00 PM', icon: '🌅' },
        { id: 'afternoon', label: 'Afternoon', range: '12:00 PM – 4:00 PM', icon: '☀️' },
        { id: 'evening', label: 'Evening', range: '4:00 PM – 7:00 PM', icon: '🌆' },
    ];

    // ─── Auth Handlers ───
    const handleContactChange = (field, value) => {
        setContact(prev => ({ ...prev, [field]: value }));
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsVerifying(true);
        setAuthError('');

        try {
            const signInPayload = { email: contact.email };

            const { error } = await supabase.auth.signInWithOtp(signInPayload);

            if (error) {
                setAuthError(error.message);
                setIsVerifying(false);
                return;
            }
            setIsVerifying(false);
            setOtpSent(true);
        } catch (err) {
            setAuthError('Something went wrong. Please try again.');
            setIsVerifying(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        const next = [...otpCode];
        next[index] = value;
        setOtpCode(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const next = [...otpCode];
        pasted.split('').forEach((char, i) => { next[i] = char; });
        setOtpCode(next);
        otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleVerifyAndBook = async (e) => {
        e.preventDefault();
        const fullCode = otpCode.join('');
        if (fullCode.length < 6) return;

        setIsVerifying(true);
        setAuthError('');

        try {
            const verifyPayload = { email: contact.email, token: fullCode, type: 'email' };

            const { data: authData, error: verifyError } = await supabase.auth.verifyOtp(verifyPayload);

            if (verifyError) {
                setAuthError(verifyError.message);
                setIsVerifying(false);
                return;
            }

            // Create/update customer profile
            const userId = authData.user?.id;
            if (userId) {
                const { error: profileError } = await supabase.from('customers').upsert({
                    id: userId,
                    full_name: contact.name,
                    phone: contact.phone,
                    email: contact.email,
                }, { onConflict: 'id' });

                if (profileError) {
                    console.error('Customer profile error:', profileError);
                    setAuthError('Failed to save your profile. Please try again.');
                    setIsVerifying(false);
                    return;
                }

                // Save the repair booking
                const { error: repairError } = await supabase.from('repairs').insert({
                    customer_id: userId,
                    device: selectedDevice?.name || 'Unknown Device',
                    issues: selectedIssues,
                    parts_tier: issueTiers,
                    service_fee: SERVICE_FEE,
                    total_estimate: calculateTotal(),
                    schedule_date: scheduleDate,
                    schedule_time: scheduleTime,
                    address: scheduleAddress,
                    status: 'pending',
                });

                if (repairError) {
                    console.error('Repair booking error:', repairError);
                    setAuthError('Failed to book your repair. Please try again.');
                    setIsVerifying(false);
                    return;
                }
            }

            setIsVerifying(false);
            setConfirmed(true);
        } catch (err) {
            setAuthError('Verification failed. Please check your code and try again.');
            setIsVerifying(false);
        }
    };

    // Get reversed generations for display (newest first)
    const sortedGens = [...DEVICE_GENERATIONS].reverse();

    return (
        <>
            <Navbar />
            <div className="quiz">
                <div className="guru-container guru-container--narrow">
                    {/* ─── Progress Bar ─────────── */}
                    <div className="quiz__progress">
                        {STEPS.map((name, i) => (
                            <div key={name} className={`quiz__step ${i <= step ? 'quiz__step--active' : ''} ${i < step ? 'quiz__step--done' : ''}`}>
                                <div className="quiz__step-indicator">
                                    {i < step ? '✓' : i + 1}
                                </div>
                                <span className="quiz__step-label">{name}</span>
                            </div>
                        ))}
                    </div>

                    {/* ─── Step 0: What needs fixing? (Device + Issues + Quality) ─────── */}
                    {step === 0 && (
                        <div className="quiz__panel animate-fade-in-up">
                            <h2 className="quiz__title">What needs fixing?</h2>
                            <p className="quiz__subtitle">Select your device and what's broken.</p>

                            {/* Device Selection */}
                            <div className="quiz__section">
                                <h3 className="quiz__section-title">Your iPhone</h3>
                                <div className="quiz__gen-tabs">
                                    {sortedGens.map((gen) => (
                                        <button
                                            key={gen}
                                            className={`quiz__gen-tab ${activeGen === gen ? 'quiz__gen-tab--active' : ''}`}
                                            onClick={() => setActiveGen(gen)}
                                        >
                                            {gen === 'SE' ? 'SE' : gen}
                                        </button>
                                    ))}
                                </div>
                                <div className="quiz__devices">
                                    {getDevicesByGeneration(activeGen).map((device) => (
                                        <button
                                            key={device.id}
                                            className={`quiz__device-card ${selectedDevice?.id === device.id ? 'quiz__device-card--selected' : ''}`}
                                            onClick={() => setSelectedDevice(device)}
                                        >
                                            <div className="quiz__device-icon">📱</div>
                                            <div className="quiz__device-name">{device.name}</div>
                                            <div className="quiz__device-year">{device.year}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Issue Selection */}
                            {selectedDevice && (
                                <div className="quiz__section">
                                    <h3 className="quiz__section-title">What's wrong with your {selectedDevice.name}?</h3>
                                    <div className="quiz__issues">
                                        {REPAIR_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                className={`quiz__issue-card ${selectedIssues.includes(type.id) ? 'quiz__issue-card--selected' : ''}`}
                                                onClick={() => toggleIssue(type.id)}
                                            >
                                                <div className="quiz__issue-icon">{type.icon}</div>
                                                <div className="quiz__issue-info">
                                                    <div className="quiz__issue-name">{type.name}</div>
                                                    <div className="quiz__issue-desc">{type.description}</div>
                                                </div>
                                                <div className="quiz__issue-check">
                                                    {selectedIssues.includes(type.id) ? '✓' : ''}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {isSoftwareOnly && (
                                        <div className="quiz__alert-box">
                                            ⚠️ We do not offer on-site appointments for software-only issues. Please visit us in-store.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quality Tier Selection (Required) */}
                            {selectedIssues.length > 0 && !isSoftwareOnly && (
                                <div className="quiz__section">
                                    <h3 className="quiz__section-title">Choose Parts Quality</h3>
                                    <p className="quiz__quality-subtitle">Select a quality tier for each repair. This affects pricing and part longevity.</p>
                                    <div className="quiz__tier-legend">
                                        {PARTS_TIERS.map((tier) => (
                                            <div key={tier.id} className="quiz__tier-legend-item">
                                                <span className="quiz__tier-legend-dot" style={{ background: tier.color }}></span>
                                                <span className="quiz__tier-legend-name">{tier.name}</span>
                                                <span className="quiz__tier-legend-desc">— {tier.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="quiz__per-issue-tiers">
                                        {selectedIssues.map((issueId) => {
                                            const type = REPAIR_TYPES.find((t) => t.id === issueId);
                                            const currentTier = issueTiers[issueId];
                                            return (
                                                <div key={issueId} className="pit-row">
                                                    <div className="pit-row__info">
                                                        <span className="pit-row__icon">{type?.icon}</span>
                                                        <span className="pit-row__name">{type?.name}</span>
                                                    </div>
                                                    <div className="pit-row__tiers">
                                                        {PARTS_TIERS.map((tier) => {
                                                            const price = SAMPLE_PRICING[issueId]?.[tier.id] || 0;
                                                            return (
                                                                <button
                                                                    key={tier.id}
                                                                    className={`pit-tier ${currentTier === tier.id ? 'pit-tier--selected' : ''}`}
                                                                    onClick={() => setTierForIssue(issueId, tier.id)}
                                                                    style={currentTier === tier.id ? { borderColor: tier.color, background: `${tier.color}10` } : undefined}
                                                                >
                                                                    <span className="pit-tier__label">{tier.name}</span>
                                                                    <span className="pit-tier__price">${price}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="quiz__actions">
                                <Link to="/" className="guru-btn guru-btn--ghost">← Back</Link>
                                <button
                                    className="guru-btn guru-btn--primary"
                                    disabled={selectedIssues.length === 0 || isSoftwareOnly || selectedIssues.some(id => !issueTiers[id])}
                                    onClick={goNext}
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Step 1: When & where? (Schedule) ─────── */}
                    {step === 1 && !confirmed && (
                        <div className="quiz__panel animate-fade-in-up">
                            <h2 className="quiz__title">When & where?</h2>
                            <p className="quiz__subtitle">
                                Pick a date and time. We need at least 3 days to order parts.
                            </p>

                            <div className="sched-section">
                                <label className="sched-label">Date</label>
                                <input
                                    type="date"
                                    className="guru-input"
                                    min={minDateStr}
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                />
                            </div>

                            <div className="sched-section">
                                <label className="sched-label">Time Slot</label>
                                <div className="sched-slots">
                                    {timeSlots.map((slot) => (
                                        <button
                                            key={slot.id}
                                            className={`sched-slot ${scheduleTime === slot.id ? 'sched-slot--selected' : ''}`}
                                            onClick={() => setScheduleTime(slot.id)}
                                        >
                                            <span className="sched-slot__icon">{slot.icon}</span>
                                            <span className="sched-slot__label">{slot.label}</span>
                                            <span className="sched-slot__range">{slot.range}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="sched-section">
                                <label className="sched-label">Your Location</label>
                                <AddressSearch
                                    value={scheduleAddress}
                                    onChange={setScheduleAddress}
                                    onServiceError={setServiceAreaError}
                                />
                                {serviceAreaError ? (
                                    <div className="sched-service-error">
                                        <span className="sched-service-error__icon">⚠️</span>
                                        <div>
                                            <strong>Not available in {serviceAreaError}</strong>
                                            <p>We currently only serve the Dallas–Fort Worth metroplex. We're expanding soon!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="sched-hint">We come to your home, office, or wherever you are. Currently serving the DFW metroplex.</p>
                                )}
                            </div>

                            <div className="quiz__actions">
                                <button className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                <button
                                    className="guru-btn guru-btn--primary guru-btn--lg"
                                    disabled={!scheduleDate || !scheduleTime || !scheduleAddress}
                                    onClick={goNext}
                                >
                                    Review & Book →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Step 2: Confirm & book (Quote Review + Contact + Auth) ─────── */}
                    {step === 2 && !confirmed && (
                        <div className="quiz__panel animate-fade-in-up">
                            {!otpSent ? (
                                <>
                                    <h2 className="quiz__title">Confirm & book</h2>
                                    <p className="quiz__subtitle">Review your repair and enter your details to book.</p>

                                    {/* Quote Review */}
                                    <div className="quiz__quote">
                                        <div className="quiz__quote-section">
                                            <div className="quiz__quote-label">Device</div>
                                            <div className="quiz__quote-value">{selectedDevice?.name}</div>
                                        </div>
                                        <div className="quiz__quote-section">
                                            <div className="quiz__quote-label">Repairs</div>
                                            {selectedIssues.map((issueId) => {
                                                const type = REPAIR_TYPES.find((t) => t.id === issueId);
                                                const tier = PARTS_TIERS.find((t) => t.id === issueTiers[issueId]);
                                                const price = getIssuePrice(issueId);
                                                return (
                                                    <div key={issueId} className="quiz__quote-line">
                                                        <span>{type?.icon} {type?.name}</span>
                                                        <span className="quiz__quote-line-right">
                                                            <span className="quiz__quote-tier-tag">{tier?.name}</span>
                                                            <span>${price}</span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            <div className="quiz__quote-line">
                                                <span>🚗 On-site Service Fee</span>
                                                <span className="quiz__quote-value">${SERVICE_FEE}</span>
                                            </div>
                                        </div>
                                        <div className="quiz__quote-section">
                                            <div className="quiz__quote-label">Appointment</div>
                                            <div className="quiz__quote-line">
                                                <span>📅 {scheduleDate}</span>
                                            </div>
                                            <div className="quiz__quote-line">
                                                <span>🕐 {timeSlots.find(s => s.id === scheduleTime)?.range}</span>
                                            </div>
                                            <div className="quiz__quote-line">
                                                <span>📍 {scheduleAddress}</span>
                                            </div>
                                        </div>
                                        <div className="quiz__quote-total">
                                            <span>Estimated Total</span>
                                            <span className="quiz__quote-total-price">${calculateTotal()}</span>
                                        </div>
                                    </div>

                                    {/* Contact Form */}
                                    <div className="quiz__section">
                                        <h3 className="quiz__section-title">Your contact details</h3>
                                        <form onSubmit={handleSendOtp}>
                                            <div className="guru-input-group" style={{ marginBottom: 16 }}>
                                                <label className="sched-label">Full Name</label>
                                                <input
                                                    className="guru-input"
                                                    type="text"
                                                    placeholder="Jane Doe"
                                                    value={contact.name}
                                                    onChange={(e) => handleContactChange('name', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="guru-input-group" style={{ marginBottom: 16 }}>
                                                <label className="sched-label">Email Address</label>
                                                <input
                                                    className="guru-input"
                                                    type="email"
                                                    placeholder="jane@example.com"
                                                    value={contact.email}
                                                    onChange={(e) => handleContactChange('email', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="guru-input-group" style={{ marginBottom: 24 }}>
                                                <label className="sched-label">Phone Number <span style={{ color: 'var(--guru-gray-400)', fontWeight: 400 }}>(optional)</span></label>
                                                <input
                                                    className="guru-input"
                                                    type="tel"
                                                    placeholder="(555) 123-4567"
                                                    value={contact.phone}
                                                    onChange={(e) => handleContactChange('phone', e.target.value)}
                                                />
                                            </div>
                                            {authError && (
                                                <p className="login-card__error">{authError}</p>
                                            )}
                                            <div className="quiz__warranty-notice" style={{ marginBottom: 16 }}>
                                                <strong>Note:</strong> Repairs do not include a warranty on parts or service.
                                                Prices are estimates. Final pricing confirmed after technician diagnosis.
                                            </div>
                                            <div className="quiz__actions">
                                                <button type="button" className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                                <button
                                                    type="submit"
                                                    className="guru-btn guru-btn--primary guru-btn--lg"
                                                    disabled={!contact.name || !contact.email || isVerifying}
                                                >
                                                    {isVerifying ? 'Sending...' : 'Send Verification Code'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="quiz__title">Enter verification code</h2>
                                    <p className="quiz__subtitle">
                                        We sent a 6-digit code to{' '}
                                        <strong>{contact.email}</strong>.
                                    </p>

                                    <form onSubmit={handleVerifyAndBook}>
                                        <div className="otp-inputs" onPaste={handleOtpPaste}>
                                            {otpCode.map((digit, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => otpRefs.current[i] = el}
                                                    className="otp-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                    autoFocus={i === 0}
                                                />
                                            ))}
                                        </div>
                                        {authError && (
                                            <p className="login-card__error">{authError}</p>
                                        )}
                                        <div className="quiz__actions">
                                            <button
                                                type="button"
                                                className="guru-btn guru-btn--ghost"
                                                onClick={() => { setOtpSent(false); setOtpCode(['', '', '', '', '', '']); }}
                                            >
                                                ← Edit Info
                                            </button>
                                            <button
                                                type="submit"
                                                className="guru-btn guru-btn--primary guru-btn--lg"
                                                disabled={otpCode.some(d => !d) || isVerifying}
                                            >
                                                {isVerifying ? 'Booking...' : 'Confirm Appointment'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    )}

                    {/* ─── Confirmation ─────── */}
                    {confirmed && (
                        <div className="quiz__panel quiz__confirmation animate-scale-in">
                            <div className="confirm__check">✓</div>
                            <h2 className="quiz__title">You're all set!</h2>
                            <p className="quiz__subtitle" style={{ marginBottom: 24 }}>
                                Your repair for <strong>{selectedDevice?.name}</strong> is booked.
                            </p>
                            <div className="confirm__details">
                                <div className="confirm__row">
                                    <span>📅</span>
                                    <span>{scheduleDate}</span>
                                </div>
                                <div className="confirm__row">
                                    <span>🕐</span>
                                    <span>{timeSlots.find(s => s.id === scheduleTime)?.range}</span>
                                </div>
                                <div className="confirm__row">
                                    <span>📍</span>
                                    <span>{scheduleAddress}</span>
                                </div>
                                <div className="confirm__row">
                                    <span>👤</span>
                                    <span>{contact.name}</span>
                                </div>
                                <div className="confirm__row">
                                    <span>💰</span>
                                    <span>Estimated ${calculateTotal()}</span>
                                </div>
                            </div>
                            <p className="quiz__disclaimer">
                                We'll confirm your appointment and begin ordering parts.
                                You'll receive updates via email or text.
                            </p>
                            <Link to="/dashboard" className="guru-btn guru-btn--primary guru-btn--lg" style={{ marginTop: 16 }}>
                                View My Repairs
                            </Link>
                        </div>
                    )}

                    {/* ─── Live Pricing Footer ─────── */}
                    {selectedIssues.length > 0 && !confirmed && step < 2 && (
                        <div className="quiz__price-footer">
                            <div className="quiz__price-footer-inner">
                                <div className="quiz__price-footer-label">
                                    Estimated Total
                                    <span className="quiz__price-footer-items">
                                        {selectedIssues.length} repair{selectedIssues.length > 1 ? 's' : ''} + service fee
                                    </span>
                                </div>
                                <div className="quiz__price-footer-amount">${calculateTotal()}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '@shared/supabase';
import { useAuth } from '@shared/AuthProvider';
import { analytics } from '@shared/analytics';
import { formatPhoneE164 } from '@shared/validation';
import {
    DEVICE_GENERATIONS,
    REPAIR_TYPES,
    PARTS_TIERS,
    SAMPLE_PRICING,
    DEVICE_REPAIR_PRICING,
    getAvailableTiersForRepair,
    getDeviceRepairPrice,
    SERVICE_FEE,
    LABOR_FEE,
    TIME_SLOTS,
    SCHEDULING_LEAD_DAYS,
    SCHEDULING_WINDOW_DAYS,
    toLocalDateKey,
    formatDisplayDate,
} from '@shared/constants';
import DeviceStep from '../components/quiz/DeviceStep';
import IssuesStep from '../components/quiz/IssuesStep';
import ScheduleStep from '../components/quiz/ScheduleStep';
import ReviewStep from '../components/quiz/ReviewStep';
import AuthStep from '../components/quiz/AuthStep';
import '../styles/repair-quiz.css';

const STEPS = ['What needs fixing?', 'When & where?', 'Confirm & book'];

const REPAIR_TYPES_ALWAYS_AVAILABLE = new Set(['screen', 'battery', 'camera-rear', 'camera-front']);
const BACK_GLASS_SUPPORTED_DEVICE_IDS = new Set([
    'iphone-14',
    'iphone-14-plus',
    'iphone-15',
    'iphone-15-plus',
    'iphone-15-pro',
    'iphone-15-pro-max',
    'iphone-16',
    'iphone-16-plus',
    'iphone-16-pro',
    'iphone-16-pro-max',
    'iphone-16e',
    'iphone-17',
    'iphone-17-air',
    'iphone-17-pro',
    'iphone-17-pro-max',
]);

export default function RepairQuiz() {
    const { user } = useAuth();
    const [step, setStep] = useState(0);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [issueTiers, setIssueTiers] = useState({});
    const [activeGen, setActiveGen] = useState('17');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleAddress, setScheduleAddress] = useState('');
    const [serviceAreaError, setServiceAreaError] = useState(null);
    const [repairNotes, setRepairNotes] = useState('');

    // Auth / Contact State
    const [contact, setContact] = useState({ name: '', email: '', phone: '' });
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [authError, setAuthError] = useState('');
    const otpRefs = useRef([]);

    const [backGlassColor, setBackGlassColor] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [availableDates, setAvailableDates] = useState(null);
    const [availableSlotsByDate, setAvailableSlotsByDate] = useState({});
    const [inventoryData, setInventoryData] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const isLoggedIn = Boolean(user);

    // Track quiz start
    useEffect(() => { analytics.quizStart(); }, []);

    // Fetch tech availability from Supabase
    useEffect(() => {
        const fetchAvailability = async () => {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() + SCHEDULING_LEAD_DAYS);
            const startStr = toLocalDateKey(startDate);

            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + SCHEDULING_LEAD_DAYS + SCHEDULING_WINDOW_DAYS);
            const endStr = toLocalDateKey(endDate);

            const { data, error } = await supabase
                .from('tech_schedules')
                .select('schedule_date, time_slots')
                .gte('schedule_date', startStr)
                .lte('schedule_date', endStr)
                .eq('is_available', true);

            if (!error && data && data.length > 0) {
                const dates = new Set();
                const slotsByDate = {};
                data.forEach((row) => {
                    dates.add(row.schedule_date);
                    const slots = Array.isArray(row.time_slots) ? row.time_slots : [];
                    if (!slotsByDate[row.schedule_date]) {
                        slotsByDate[row.schedule_date] = new Set();
                    }
                    slots.forEach((s) => slotsByDate[row.schedule_date].add(s));
                });
                const slotsObj = {};
                Object.entries(slotsByDate).forEach(([date, slotSet]) => {
                    slotsObj[date] = [...slotSet];
                });
                setAvailableDates(dates);
                setAvailableSlotsByDate(slotsObj);
            }
        };

        fetchAvailability();
    }, []);

    // Fetch inventory data when device changes
    useEffect(() => {
        if (!selectedDevice) {
            setInventoryData([]);
            return;
        }

        const fetchInventory = async () => {
            setInventoryLoading(true);
            const { data, error } = await supabase
                .from('parts_inventory')
                .select('repair_type, parts_tier, quantity')
                .eq('device', selectedDevice.name);

            if (!error && data) {
                setInventoryData(data);
            }
            setInventoryLoading(false);
        };

        fetchInventory();

        const channel = supabase
            .channel(`inventory-${selectedDevice.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'parts_inventory',
            }, () => {
                fetchInventory();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedDevice]);

    const isPartInStock = (issueId, tierId) => {
        if (inventoryData.length === 0) return null;
        const item = inventoryData.find(
            i => i.repair_type === issueId && i.parts_tier === tierId
        );
        return item ? item.quantity > 0 : false;
    };

    const allPartsInStock = useMemo(() => {
        if (selectedIssues.length === 0) return false;
        if (inventoryData.length === 0) return null;
        return selectedIssues.every(issueId => {
            const tier = issueTiers[issueId];
            if (!tier) return false;
            return isPartInStock(issueId, tier);
        });
    }, [selectedIssues, issueTiers, inventoryData]);

    const needsPartsOrder = useMemo(() => {
        if (selectedIssues.length === 0) return false;
        if (inventoryData.length === 0) return true;
        return selectedIssues.some(issueId => {
            const tier = issueTiers[issueId];
            if (!tier) return true;
            return !isPartInStock(issueId, tier);
        });
    }, [selectedIssues, issueTiers, inventoryData]);

    const goNext = () => {
        setStep((s) => {
            const next = Math.min(s + 1, STEPS.length - 1);
            analytics.quizStep(STEPS[next], { from: s, to: next });
            return next;
        });
    };
    const goBack = () => setStep((s) => Math.max(s - 1, 0));

    const availableRepairTypes = useMemo(() => {
        if (!selectedDevice) return REPAIR_TYPES.filter(type => REPAIR_TYPES_ALWAYS_AVAILABLE.has(type.id));

        return REPAIR_TYPES.filter((type) => {
            if (REPAIR_TYPES_ALWAYS_AVAILABLE.has(type.id)) return true;
            return type.id === 'back-glass' && BACK_GLASS_SUPPORTED_DEVICE_IDS.has(selectedDevice.id);
        });
    }, [selectedDevice]);

    useEffect(() => {
        const allowedIssues = new Set(availableRepairTypes.map((type) => type.id));
        setSelectedIssues((prev) => {
            const next = prev.filter((issueId) => allowedIssues.has(issueId));
            if (!next.includes('back-glass')) setBackGlassColor('');
            return next;
        });
        setIssueTiers((prev) => {
            const next = {};
            Object.entries(prev).forEach(([issueId, tier]) => {
                if (allowedIssues.has(issueId)) next[issueId] = tier;
            });
            return next;
        });
    }, [availableRepairTypes]);

    useEffect(() => {
        if (!selectedDevice) return;
        setIssueTiers((prev) => {
            const next = { ...prev };
            Object.entries(prev).forEach(([issueId, tierId]) => {
                const availableTierIds = getAvailableTiersForRepair(selectedDevice.name, issueId);
                if (availableTierIds && !availableTierIds.includes(tierId)) {
                    delete next[issueId];
                }
            });
            return next;
        });
    }, [selectedDevice]);

    useEffect(() => {
        async function hydrateLoggedInContact() {
            if (!user) return;

            const { data: profile } = await supabase
                .from('customers')
                .select('full_name, email, phone')
                .eq('id', user.id)
                .maybeSingle();

            setContact({
                name: profile?.full_name || user.user_metadata?.full_name || '',
                email: profile?.email || user.email || '',
                phone: profile?.phone || '',
            });
        }

        hydrateLoggedInContact();
    }, [user]);

    const toggleIssue = (id) => {
        setSelectedIssues((prev) => {
            const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            if (prev.includes(id)) {
                setIssueTiers((t) => {
                    const copy = { ...t };
                    delete copy[id];
                    return copy;
                });
                if (id === 'back-glass') setBackGlassColor('');
            }
            return next;
        });
    };

    const setTierForIssue = (issueId, tier) => {
        setIssueTiers((prev) => ({ ...prev, [issueId]: tier }));
    };

    const getIssuePrice = (issueId) => {
        const tier = issueTiers[issueId] || 'premium';
        if (selectedDevice) {
            const devicePrice = getDeviceRepairPrice(selectedDevice.name, issueId, tier);
            if (devicePrice !== null) return devicePrice;
        }
        return SAMPLE_PRICING[issueId]?.[tier] || 0;
    };

    const calculateTotal = () => {
        const partsTotal = selectedIssues.reduce((sum, id) => sum + getIssuePrice(id), 0);
        return partsTotal + SERVICE_FEE + LABOR_FEE;
    };

    const isSoftwareOnly = selectedIssues.length === 1 && selectedIssues[0] === 'software';

    const schedulingLeadDays = allPartsInStock === true ? 1 : SCHEDULING_LEAD_DAYS;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + schedulingLeadDays);
    const minDateStr = toLocalDateKey(minDate);

    // ─── Auth Handlers ───
    const handleContactChange = (field, value) => {
        setContact(prev => ({ ...prev, [field]: value }));
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsVerifying(true);
        setAuthError('');

        try {
            const { error } = await supabase.auth.signInWithOtp({ email: contact.email });

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
            const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
                email: contact.email, token: fullCode, type: 'email',
            });

            if (verifyError) {
                setAuthError(verifyError.message);
                setIsVerifying(false);
                return;
            }

            const userId = authData.user?.id;
            if (userId) {
                const normalizedPhone = contact.phone ? (formatPhoneE164(contact.phone) || contact.phone) : null;
                const { error: profileError } = await supabase.from('customers').upsert({
                    id: userId,
                    full_name: contact.name,
                    phone: normalizedPhone,
                    email: contact.email,
                }, { onConflict: 'id' });

                if (profileError) {
                    setAuthError('Failed to save your profile. Please try again.');
                    setIsVerifying(false);
                    return;
                }

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
                    parts_in_stock: allPartsInStock === true,
                    device_color: backGlassColor || null,
                    notes: repairNotes.trim() || null,
                });

                if (repairError) {
                    setAuthError('Failed to book your repair. Please try again.');
                    setIsVerifying(false);
                    return;
                }
            }

            setIsVerifying(false);
            setConfirmed(true);
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues });
        } catch (err) {
            setAuthError('Verification failed. Please check your code and try again.');
            setIsVerifying(false);
        }
    };

    const handleBookLoggedIn = async () => {
        if (!user) return;

        setIsVerifying(true);
        setAuthError('');

        try {
            const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer';
            const normalizedPhone = contact.phone ? (formatPhoneE164(contact.phone) || contact.phone) : null;
            const profilePayload = {
                id: user.id,
                full_name: contact.name || fallbackName,
                phone: normalizedPhone,
                email: contact.email || user.email,
            };

            const { error: profileError } = await supabase
                .from('customers')
                .upsert(profilePayload, { onConflict: 'id' });

            if (profileError) {
                setAuthError('Failed to load your profile. Please try again.');
                setIsVerifying(false);
                return;
            }

            const { error: repairError } = await supabase.from('repairs').insert({
                customer_id: user.id,
                device: selectedDevice?.name || 'Unknown Device',
                issues: selectedIssues,
                parts_tier: issueTiers,
                service_fee: SERVICE_FEE,
                total_estimate: calculateTotal(),
                schedule_date: scheduleDate,
                schedule_time: scheduleTime,
                address: scheduleAddress,
                status: 'pending',
                parts_in_stock: allPartsInStock === true,
                device_color: backGlassColor || null,
                notes: repairNotes.trim() || null,
            });

            if (repairError) {
                setAuthError('Failed to book your repair. Please try again.');
                setIsVerifying(false);
                return;
            }

            setContact((prev) => ({ ...prev, name: profilePayload.full_name, email: profilePayload.email }));
            setConfirmed(true);
            setIsVerifying(false);
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues });
        } catch (err) {
            setAuthError('Failed to book your repair. Please try again.');
            setIsVerifying(false);
        }
    };

    const handleDateChange = (date) => {
        setScheduleDate(date);
        if (scheduleTime && availableDates) {
            const dateSlots = availableSlotsByDate[date];
            if (!dateSlots || !dateSlots.includes(scheduleTime)) {
                setScheduleTime('');
            }
        }
    };

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

                            <DeviceStep
                                activeGen={activeGen}
                                onGenChange={setActiveGen}
                                selectedDevice={selectedDevice}
                                onSelectDevice={setSelectedDevice}
                                sortedGens={sortedGens}
                            />

                            {selectedDevice && (
                                <IssuesStep
                                    selectedDevice={selectedDevice}
                                    selectedIssues={selectedIssues}
                                    issueTiers={issueTiers}
                                    availableRepairTypes={availableRepairTypes}
                                    backGlassColor={backGlassColor}
                                    isSoftwareOnly={isSoftwareOnly}
                                    onToggleIssue={toggleIssue}
                                    onSetTier={setTierForIssue}
                                    onSetBackGlassColor={setBackGlassColor}
                                    isPartInStock={isPartInStock}
                                />
                            )}

                            <div className="quiz__actions">
                                <Link to="/" className="guru-btn guru-btn--ghost">← Back</Link>
                                <button
                                    className="guru-btn guru-btn--primary"
                                    disabled={
                                        selectedIssues.length === 0 ||
                                        isSoftwareOnly ||
                                        selectedIssues.some(id => !issueTiers[id]) ||
                                        (selectedIssues.includes('back-glass') && !backGlassColor)
                                    }
                                    onClick={goNext}
                                >
                                    Continue →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Step 1: When & where? (Schedule) ─────── */}
                    {step === 1 && !confirmed && (
                        <ScheduleStep
                            scheduleDate={scheduleDate}
                            scheduleTime={scheduleTime}
                            scheduleAddress={scheduleAddress}
                            serviceAreaError={serviceAreaError}
                            allPartsInStock={allPartsInStock}
                            needsPartsOrder={needsPartsOrder}
                            minDateStr={minDateStr}
                            availableDates={availableDates}
                            availableSlotsByDate={availableSlotsByDate}
                            onDateChange={handleDateChange}
                            onTimeChange={setScheduleTime}
                            onAddressChange={setScheduleAddress}
                            onServiceAreaError={setServiceAreaError}
                            onBack={goBack}
                            onNext={goNext}
                        />
                    )}

                    {/* ─── Step 2: Confirm & book (Quote Review + Contact + Auth) ─────── */}
                    {step === 2 && !confirmed && (
                        <div className="quiz__panel animate-fade-in-up">
                            {isLoggedIn ? (
                                <ReviewStep
                                    isLoggedIn={true}
                                    selectedDevice={selectedDevice}
                                    selectedIssues={selectedIssues}
                                    issueTiers={issueTiers}
                                    backGlassColor={backGlassColor}
                                    scheduleDate={scheduleDate}
                                    scheduleTime={scheduleTime}
                                    scheduleAddress={scheduleAddress}
                                    repairNotes={repairNotes}
                                    contact={contact}
                                    userEmail={user.email}
                                    authError={authError}
                                    isVerifying={isVerifying}
                                    getIssuePrice={getIssuePrice}
                                    calculateTotal={calculateTotal}
                                    onRepairNotesChange={setRepairNotes}
                                    onContactChange={handleContactChange}
                                    onBack={goBack}
                                    onBook={handleBookLoggedIn}
                                />
                            ) : !otpSent ? (
                                <ReviewStep
                                    isLoggedIn={false}
                                    selectedDevice={selectedDevice}
                                    selectedIssues={selectedIssues}
                                    issueTiers={issueTiers}
                                    backGlassColor={backGlassColor}
                                    scheduleDate={scheduleDate}
                                    scheduleTime={scheduleTime}
                                    scheduleAddress={scheduleAddress}
                                    repairNotes={repairNotes}
                                    contact={contact}
                                    authError={authError}
                                    isVerifying={isVerifying}
                                    getIssuePrice={getIssuePrice}
                                    calculateTotal={calculateTotal}
                                    onRepairNotesChange={setRepairNotes}
                                    onContactChange={handleContactChange}
                                    onBack={goBack}
                                    onSendOtp={handleSendOtp}
                                />
                            ) : (
                                <AuthStep
                                    contactEmail={contact.email}
                                    otpCode={otpCode}
                                    authError={authError}
                                    isVerifying={isVerifying}
                                    otpRefs={otpRefs}
                                    onOtpChange={handleOtpChange}
                                    onOtpKeyDown={handleOtpKeyDown}
                                    onOtpPaste={handleOtpPaste}
                                    onEditInfo={() => { setOtpSent(false); setOtpCode(['', '', '', '', '', '']); }}
                                    onVerify={handleVerifyAndBook}
                                />
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
                                    <span>{scheduleDate ? formatDisplayDate(scheduleDate) : ''}</span>
                                </div>
                                <div className="confirm__row">
                                    <span>🕐</span>
                                    <span>{TIME_SLOTS.find(s => s.id === scheduleTime)?.range}</span>
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
                                {allPartsInStock === true
                                    ? 'All parts are in stock! We\'ll confirm your appointment shortly. You\'ll receive updates via email or text.'
                                    : 'We\'ll confirm your appointment and begin ordering the needed parts. You\'ll receive updates via email or text.'}
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
                                        {selectedIssues.length} repair{selectedIssues.length > 1 ? 's' : ''} + labor + service fee
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

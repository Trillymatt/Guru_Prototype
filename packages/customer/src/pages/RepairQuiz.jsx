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
    getDevicesByGeneration,
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
const SCHEDULE_TIME_PENDING = 'to_be_scheduled';
const REFERRAL_STORAGE_KEY = 'guru_referral_code';
const REFERRAL_DISCOUNT_AMOUNT = 5;
const REFERRAL_CODE_REGEX = /^[A-Z0-9]{8}$/;

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

const normalizeReferralCode = (value) => (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

const getReferralValidationError = (referralCode, ownReferralCode) => {
    if (!referralCode) return '';
    if (!REFERRAL_CODE_REGEX.test(referralCode)) {
        return 'Referral code must be 8 letters or numbers.';
    }
    if (ownReferralCode && referralCode === ownReferralCode) {
        return 'You cannot use your own referral code.';
    }
    return '';
};

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
    const [referralCode, setReferralCode] = useState('');
    const [referralCodeError, setReferralCodeError] = useState('');
    const [ownReferralCode, setOwnReferralCode] = useState('');
    const [bookedTotalEstimate, setBookedTotalEstimate] = useState(null);

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
    const [inventoryData, setInventoryData] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const isLoggedIn = Boolean(user);

    // Saved devices & addresses
    const [savedDevices, setSavedDevices] = useState([]);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [savedDataLoaded, setSavedDataLoaded] = useState(false);
    const [suppressStep0AutoAdvance, setSuppressStep0AutoAdvance] = useState(false);
    const [suppressStep1AutoAdvance, setSuppressStep1AutoAdvance] = useState(false);
    const [pricePulseKey, setPricePulseKey] = useState(0);
    const [scheduleWindowOffsetWeeks, setScheduleWindowOffsetWeeks] = useState(0);
    const step0Ref = useRef(null);
    const step1DateRef = useRef(null);
    const step2ReviewRef = useRef(null);

    // Track quiz start
    useEffect(() => { analytics.quizStart(); }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromLink = normalizeReferralCode(urlParams.get('ref') || '');
        const storedCode = normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || '');
        const initialCode = codeFromLink || storedCode;

        if (!initialCode) return;
        setReferralCode(initialCode);

        if (REFERRAL_CODE_REGEX.test(initialCode)) {
            window.localStorage.setItem(REFERRAL_STORAGE_KEY, initialCode);
        }
    }, []);

    // Fetch saved devices and addresses for logged-in users
    useEffect(() => {
        if (!user) return;

        const fetchSavedData = async () => {
            const [devicesRes, addressesRes] = await Promise.all([
                supabase
                    .from('customer_devices')
                    .select('*')
                    .eq('customer_id', user.id)
                    .order('is_default', { ascending: false }),
                supabase
                    .from('customer_addresses')
                    .select('*')
                    .eq('customer_id', user.id)
                    .order('is_default', { ascending: false }),
            ]);

            if (devicesRes.data) setSavedDevices(devicesRes.data);
            if (addressesRes.data) setSavedAddresses(addressesRes.data);
            setSavedDataLoaded(true);

            // Auto-select default device if none is selected yet
            if (devicesRes.data && devicesRes.data.length > 0 && !selectedDevice) {
                const defaultDevice = devicesRes.data.find(d => d.is_default) || devicesRes.data[0];
                const matchingDevice = DEVICE_GENERATIONS.reduce((found, gen) => {
                    if (found) return found;
                    const devices = getDevicesByGeneration(gen);
                    return devices.find(d => d.id === defaultDevice.device_id);
                }, null);

                if (matchingDevice) {
                    setSelectedDevice(matchingDevice);
                    setActiveGen(matchingDevice.generation);
                    if (defaultDevice.device_color) {
                        setBackGlassColor(defaultDevice.device_color);
                    }
                }
            }

            // Auto-fill default address
            if (addressesRes.data && addressesRes.data.length > 0 && !scheduleAddress) {
                const defaultAddr = addressesRes.data.find(a => a.is_default) || addressesRes.data[0];
                setScheduleAddress(defaultAddr.address);
            }
        };

        fetchSavedData();
    }, [user]);

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

            if (error) {
                setAvailableDates(new Set());
                return;
            }

            const dates = new Set();
            (data || []).forEach((row) => {
                const slots = Array.isArray(row.time_slots) ? row.time_slots.filter(Boolean) : [];
                if (slots.length === 0) return; // only dates with at least one valid slot are bookable
                dates.add(row.schedule_date);
            });

            setAvailableDates(dates);
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

    // Declared before effects that reference it (TDZ: const cannot be used before this line)
    const isSoftwareOnly = selectedIssues.length === 1 && selectedIssues[0] === 'software';

    const autoAdvanceTimerRef = useRef(null);
    const previousStepRef = useRef(step);

    const goNext = () => {
        setStep((s) => {
            const next = Math.min(s + 1, STEPS.length - 1);
            analytics.quizStep(STEPS[next], { from: s, to: next });
            return next;
        });
    };
    const goBack = () => setStep((s) => {
        const next = Math.max(s - 1, 0);
        if (s === 1 && next === 0) setSuppressStep0AutoAdvance(true);
        if (s === 2 && next === 1) setSuppressStep1AutoAdvance(true);
        return next;
    });

    // Auto-advance step 0 when all required selections are complete
    useEffect(() => {
        if (step !== 0) return;
        if (suppressStep0AutoAdvance) return;
        if (selectedIssues.length === 0) return;
        if (isSoftwareOnly) return;
        // All issues must have tiers selected
        const allTiersSelected = selectedIssues.every(id => issueTiers[id]);
        if (!allTiersSelected) return;
        // If back-glass is selected, color must be chosen
        if (selectedIssues.includes('back-glass') && !backGlassColor) return;

        // Auto-advance after a short delay so the user sees their selection
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = setTimeout(() => {
            goNext();
        }, 600);

        return () => clearTimeout(autoAdvanceTimerRef.current);
    }, [step, selectedIssues, issueTiers, backGlassColor, isSoftwareOnly, suppressStep0AutoAdvance]);

    useEffect(() => {
        if (selectedIssues.length > 0) {
            setPricePulseKey((k) => k + 1);
        }
    }, [selectedDevice, selectedIssues, issueTiers]);

    const smoothScrollToRef = (ref) => {
        if (!ref?.current) return;
        const navbarOffset = 100;
        const top = ref.current.getBoundingClientRect().top + window.scrollY - navbarOffset;
        window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    };

    useEffect(() => {
        const prevStep = previousStepRef.current;
        previousStepRef.current = step;

        // Wait for next step DOM to mount before scrolling.
        requestAnimationFrame(() => {
            if (step === 0) {
                smoothScrollToRef(step0Ref);
                return;
            }
            if (step === 1) {
                smoothScrollToRef(step1DateRef);
                return;
            }
            if (step === 2) {
                // When entering review, prioritize landing on the quote/price block.
                if (prevStep === 1 || prevStep === 0) {
                    smoothScrollToRef(step2ReviewRef);
                } else {
                    smoothScrollToRef(step2ReviewRef);
                }
            }
        });
    }, [step]);

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
                .select('full_name, email, phone, referral_code')
                .eq('id', user.id)
                .maybeSingle();

            setContact({
                name: profile?.full_name || user.user_metadata?.full_name || '',
                email: profile?.email || user.email || '',
                phone: profile?.phone || '',
            });
            setOwnReferralCode(normalizeReferralCode(profile?.referral_code || ''));
        }

        hydrateLoggedInContact();
    }, [user]);

    const toggleIssue = (id) => {
        setSuppressStep0AutoAdvance(false);
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
        setSuppressStep0AutoAdvance(false);
        setIssueTiers((prev) => ({ ...prev, [issueId]: tier }));
    };

    const getBookingErrorMessage = (fallback, error) => {
        if (!error) return fallback;
        const message = error.message || '';
        if (error.code === '42501') {
            return 'Booking failed due to permissions. Please refresh and sign in again.';
        }
        if (error.code === '23503' && message.includes('customer_id')) {
            return 'Your profile is still syncing. Please wait a few seconds and try again.';
        }
        return `${fallback} ${message ? `(${message})` : ''}`.trim();
    };

    const getReferralCodeForBooking = () => {
        const normalized = normalizeReferralCode(referralCode);
        const referralError = getReferralValidationError(normalized, ownReferralCode);
        setReferralCodeError(referralError);
        if (referralError) return { code: null, error: referralError };
        return { code: normalized || null, error: '' };
    };

    const getIssuePrice = (issueId) => {
        const tier = issueTiers[issueId] || 'premium';
        if (selectedDevice) {
            const devicePrice = getDeviceRepairPrice(selectedDevice.name, issueId, tier);
            if (devicePrice !== null) return devicePrice;
        }
        return SAMPLE_PRICING[issueId]?.[tier] || 0;
    };

    const calculateBaseTotal = () => {
        const partsTotal = selectedIssues.reduce((sum, id) => sum + getIssuePrice(id), 0);
        return partsTotal + SERVICE_FEE + LABOR_FEE;
    };

    const referralDiscountPreview = useMemo(() => {
        const normalized = normalizeReferralCode(referralCode);
        const error = getReferralValidationError(normalized, ownReferralCode);
        if (error) return 0;
        return normalized ? REFERRAL_DISCOUNT_AMOUNT : 0;
    }, [referralCode, ownReferralCode]);

    const calculateTotal = () => Math.max(calculateBaseTotal() - referralDiscountPreview, 0);

    const schedulingLeadDays = allPartsInStock === true ? 1 : SCHEDULING_LEAD_DAYS;
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const minDate = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + schedulingLeadDays);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [schedulingLeadDays, today]);
    const minDateStr = toLocalDateKey(minDate);

    const previewWindowStartDate = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay() + (scheduleWindowOffsetWeeks * 7));
        return d;
    }, [today, scheduleWindowOffsetWeeks]);

    const previewWindowEndDate = useMemo(() => {
        const d = new Date(previewWindowStartDate);
        d.setDate(d.getDate() + 13);
        return d;
    }, [previewWindowStartDate]);

    const previewWindowStartStr = toLocalDateKey(previewWindowStartDate);
    const previewWindowEndStr = toLocalDateKey(previewWindowEndDate);
    const maxWindowOffsetWeeks = Math.max(0, Math.floor((SCHEDULING_WINDOW_DAYS - 14) / 7));

    const filteredAvailableDates = useMemo(() => {
        if (!availableDates) return null;
        const next = new Set();
        availableDates.forEach((date) => {
            if (date >= previewWindowStartStr && date <= previewWindowEndStr) {
                next.add(date);
            }
        });
        return next;
    }, [availableDates, previewWindowStartStr, previewWindowEndStr]);

    useEffect(() => {
        if (!scheduleDate) return;
        const inVisibleWindow = scheduleDate >= previewWindowStartStr && scheduleDate <= previewWindowEndStr;
        const dateHasSlots = filteredAvailableDates ? filteredAvailableDates.has(scheduleDate) : true;
        if (!inVisibleWindow || !dateHasSlots) {
            setScheduleDate('');
            setScheduleTime('');
        }
    }, [scheduleDate, previewWindowStartStr, previewWindowEndStr, filteredAvailableDates]);

    // ─── Auth Handlers ───
    const handleContactChange = (field, value) => {
        setContact(prev => ({ ...prev, [field]: value }));
    };

    const handleReferralCodeChange = (value) => {
        const normalized = normalizeReferralCode(value);
        setReferralCode(normalized);
        setReferralCodeError(getReferralValidationError(normalized, ownReferralCode));

        if (!normalized) {
            window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
            return;
        }

        if (REFERRAL_CODE_REGEX.test(normalized)) {
            window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
        }
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
        if (!scheduleDate || !scheduleAddress || !filteredAvailableDates?.has(scheduleDate)) {
            setAuthError('Please select an available date and address before booking.');
            return;
        }

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
                    setAuthError(getBookingErrorMessage('Failed to save your profile. Please try again.', profileError));
                    console.error('Profile upsert failed during OTP booking:', profileError);
                    setIsVerifying(false);
                    return;
                }

                const { code: referralCodeForBooking, error: referralError } = getReferralCodeForBooking();
                if (referralError) {
                    setAuthError(referralError);
                    setIsVerifying(false);
                    return;
                }

                const { data: bookingData, error: repairError } = await supabase.rpc('book_repair_with_referral', {
                    p_device: selectedDevice?.name || 'Unknown Device',
                    p_issues: selectedIssues,
                    p_parts_tier: issueTiers,
                    p_service_fee: SERVICE_FEE,
                    p_labor_fee: LABOR_FEE,
                    p_total_estimate_base: calculateBaseTotal(),
                    p_schedule_date: scheduleDate,
                    p_schedule_time: SCHEDULE_TIME_PENDING,
                    p_address: scheduleAddress,
                    p_parts_in_stock: allPartsInStock === true,
                    p_device_color: backGlassColor || null,
                    p_notes: repairNotes.trim() || null,
                    p_referral_code: referralCodeForBooking,
                });

                if (repairError) {
                    if ((repairError.message || '').toLowerCase().includes('referral')) {
                        setReferralCodeError(repairError.message);
                    }
                    setAuthError(getBookingErrorMessage('Failed to book your repair. Please try again.', repairError));
                    console.error('Repair insert failed during OTP booking:', repairError);
                    setIsVerifying(false);
                    return;
                }

                const bookingRow = Array.isArray(bookingData) ? bookingData[0] : bookingData;
                setBookedTotalEstimate(Number(bookingRow?.total_estimate ?? calculateTotal()));
            }

            setIsVerifying(false);
            setConfirmed(true);
            window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues });
        } catch (err) {
            setAuthError(`Verification failed. ${err?.message ? `(${err.message})` : 'Please check your code and try again.'}`);
            console.error('OTP verification failed:', err);
            setIsVerifying(false);
        }
    };

    const handleBookLoggedIn = async () => {
        if (!user) return;
        if (!scheduleDate || !scheduleAddress || !filteredAvailableDates?.has(scheduleDate)) {
            setAuthError('Please select an available date and address before booking.');
            return;
        }

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
                setAuthError(getBookingErrorMessage('Failed to load your profile. Please try again.', profileError));
                console.error('Profile upsert failed for signed-in booking:', profileError);
                setIsVerifying(false);
                return;
            }

            const { code: referralCodeForBooking, error: referralError } = getReferralCodeForBooking();
            if (referralError) {
                setAuthError(referralError);
                setIsVerifying(false);
                return;
            }

            const { data: bookingData, error: repairError } = await supabase.rpc('book_repair_with_referral', {
                p_device: selectedDevice?.name || 'Unknown Device',
                p_issues: selectedIssues,
                p_parts_tier: issueTiers,
                p_service_fee: SERVICE_FEE,
                p_labor_fee: LABOR_FEE,
                p_total_estimate_base: calculateBaseTotal(),
                p_schedule_date: scheduleDate,
                p_schedule_time: SCHEDULE_TIME_PENDING,
                p_address: scheduleAddress,
                p_parts_in_stock: allPartsInStock === true,
                p_device_color: backGlassColor || null,
                p_notes: repairNotes.trim() || null,
                p_referral_code: referralCodeForBooking,
            });

            if (repairError) {
                if ((repairError.message || '').toLowerCase().includes('referral')) {
                    setReferralCodeError(repairError.message);
                }
                setAuthError(getBookingErrorMessage('Failed to book your repair. Please try again.', repairError));
                console.error('Repair insert failed for signed-in booking:', repairError);
                setIsVerifying(false);
                return;
            }

            const bookingRow = Array.isArray(bookingData) ? bookingData[0] : bookingData;
            setBookedTotalEstimate(Number(bookingRow?.total_estimate ?? calculateTotal()));

            // Auto-save address if it's new (not already in saved addresses)
            if (scheduleAddress && savedDataLoaded) {
                const addressAlreadySaved = savedAddresses.some(a => a.address === scheduleAddress);
                if (!addressAlreadySaved) {
                    await supabase.from('customer_addresses').insert({
                        customer_id: user.id,
                        label: 'Other',
                        address: scheduleAddress,
                        is_default: savedAddresses.length === 0,
                    });
                }
            }

            setContact((prev) => ({ ...prev, name: profilePayload.full_name, email: profilePayload.email }));
            setConfirmed(true);
            setIsVerifying(false);
            window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues });
        } catch (err) {
            setAuthError(`Failed to book your repair. ${err?.message ? `(${err.message})` : 'Please try again.'}`);
            console.error('Unexpected booking error for signed-in user:', err);
            setIsVerifying(false);
        }
    };

    const handleDateChange = (date) => {
        setSuppressStep1AutoAdvance(false);
        setScheduleDate(date);
        setScheduleTime('');
    };

    const handleAddressChange = (address) => {
        setSuppressStep1AutoAdvance(false);
        setScheduleAddress(address);
    };

    const handleScheduleWindowNext = () => {
        setSuppressStep1AutoAdvance(false);
        setScheduleWindowOffsetWeeks((prev) => Math.min(prev + 1, maxWindowOffsetWeeks));
    };

    const handleScheduleWindowPrev = () => {
        setSuppressStep1AutoAdvance(false);
        setScheduleWindowOffsetWeeks((prev) => Math.max(prev - 1, 0));
    };

    const autoAdvanceHint = useMemo(() => {
        if (step === 0) {
            if (suppressStep0AutoAdvance) return 'Auto-advance paused while you review options';
            return 'Nice picks - we will move you forward automatically';
        }
        if (step === 1) {
            if (suppressStep1AutoAdvance) return 'Auto-advance paused while you review schedule details';
            return 'Almost done - once details are complete we will move you ahead';
        }
        return 'Final step - lock in your repair';
    }, [step, suppressStep0AutoAdvance, suppressStep1AutoAdvance]);

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
                        <div ref={step0Ref} className="quiz__panel animate-fade-in-up">
                            <h2 className="quiz__title">What needs fixing?</h2>
                            <p className="quiz__subtitle">Select your device and what's broken.</p>

                            <DeviceStep
                                activeGen={activeGen}
                                onGenChange={(gen) => {
                                    setSuppressStep0AutoAdvance(false);
                                    setActiveGen(gen);
                                }}
                                selectedDevice={selectedDevice}
                                onSelectDevice={(device) => {
                                    setSuppressStep0AutoAdvance(false);
                                    setSelectedDevice(device);
                                }}
                                sortedGens={sortedGens}
                                savedDevices={savedDevices}
                                onSelectSavedDevice={(saved) => {
                                    setSuppressStep0AutoAdvance(false);
                                    const matchingDevice = DEVICE_GENERATIONS.reduce((found, gen) => {
                                        if (found) return found;
                                        return getDevicesByGeneration(gen).find(d => d.id === saved.device_id);
                                    }, null);
                                    if (matchingDevice) {
                                        setSelectedDevice(matchingDevice);
                                        setActiveGen(matchingDevice.generation);
                                        if (saved.device_color) setBackGlassColor(saved.device_color);
                                    }
                                }}
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
                                    onSetBackGlassColor={(color) => {
                                        setSuppressStep0AutoAdvance(false);
                                        setBackGlassColor(color);
                                    }}
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
                            scheduleAddress={scheduleAddress}
                            serviceAreaError={serviceAreaError}
                            minDateStr={minDateStr}
                            maxDateStr={previewWindowEndStr}
                            previewStartStr={previewWindowStartStr}
                            availableDates={filteredAvailableDates}
                            onDateChange={handleDateChange}
                            onAddressChange={handleAddressChange}
                            onServiceAreaError={setServiceAreaError}
                            onBack={goBack}
                            onNext={goNext}
                            savedAddresses={savedAddresses}
                            suppressAutoAdvance={suppressStep1AutoAdvance}
                            canGoPrevWindow={scheduleWindowOffsetWeeks > 0}
                            canGoNextWindow={scheduleWindowOffsetWeeks < maxWindowOffsetWeeks}
                            onPrevWindow={handleScheduleWindowPrev}
                            onNextWindow={handleScheduleWindowNext}
                            dateSectionRef={step1DateRef}
                        />
                    )}

                    {/* ─── Step 2: Confirm & book (Quote Review + Contact + Auth) ─────── */}
                    {step === 2 && !confirmed && (
                        <div ref={step2ReviewRef} className="quiz__panel animate-fade-in-up">
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
                                    referralDiscountPreview={referralDiscountPreview}
                                    referralCode={referralCode}
                                    ownReferralCode={ownReferralCode}
                                    referralCodeError={referralCodeError}
                                    onRepairNotesChange={setRepairNotes}
                                    onReferralCodeChange={handleReferralCodeChange}
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
                                    referralDiscountPreview={referralDiscountPreview}
                                    referralCode={referralCode}
                                    ownReferralCode={ownReferralCode}
                                    referralCodeError={referralCodeError}
                                    onRepairNotesChange={setRepairNotes}
                                    onReferralCodeChange={handleReferralCodeChange}
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
                                    <span>{TIME_SLOTS.find(s => s.id === scheduleTime)?.range || 'To be scheduled after parts arrive'}</span>
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
                                    <span>Estimated ${bookedTotalEstimate ?? calculateTotal()}</span>
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
                                    <span className="quiz__price-footer-hype">✨ {autoAdvanceHint}</span>
                                </div>
                                <div key={pricePulseKey} className="quiz__price-footer-amount quiz__price-footer-amount--pulse">${calculateTotal()}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
}

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
    SAMPLE_PRICING,
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

const STEP_CONTACT = 0;
const STEP_PHONE = 1;
const STEP_DEVICE = 2;
const STEP_ISSUES = 3;
const STEP_QUALITY = 4;
const STEP_ADDRESS = 5;
const STEP_DATE = 6;
const STEP_REVIEW = 7;
const STEP_VERIFY = 8;
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
    const [contact, setContact] = useState({ name: '', email: '', phone: '', backupPhone: '' });
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [authError, setAuthError] = useState('');
    const otpRefs = useRef([]);

    const [backGlassColor, setBackGlassColor] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [availableDates, setAvailableDates] = useState(null);
    const [inventoryData, setInventoryData] = useState([]);
    const isLoggedIn = Boolean(user);

    // Saved devices & addresses
    const [savedDevices, setSavedDevices] = useState([]);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [savedDataLoaded, setSavedDataLoaded] = useState(false);
    const [pricePulseKey, setPricePulseKey] = useState(0);
    const [scheduleWindowOffsetWeeks, setScheduleWindowOffsetWeeks] = useState(0);
    const [clickCount, setClickCount] = useState(0);
    const autoAdvanceTimeoutRef = useRef(null);
    const canContinueFromContactRef = useRef(false);
    const canContinueFromPhoneRef = useRef(false);
    const canContinueFromDeviceRef = useRef(false);
    const canContinueFromIssuesRef = useRef(false);
    const canContinueFromQualityRef = useRef(false);
    const canContinueFromAddressRef = useRef(false);
    const canContinueFromDateRef = useRef(false);

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
            const { data, error } = await supabase
                .from('parts_inventory')
                .select('repair_type, parts_tier, quantity')
                .eq('device', selectedDevice.name);

            if (!error && data) {
                setInventoryData(data);
            }
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

    // Declared before effects that reference it (TDZ: const cannot be used before this line)
    const isSoftwareOnly = selectedIssues.length === 1 && selectedIssues[0] === 'software';
    const quizSteps = useMemo(() => (
        isLoggedIn
            ? ['Your name & email', 'Phone number', 'Choose device', 'Choose repairs', 'Choose quality', 'Add address', 'Pick date', 'Review & book']
            : ['Your name & email', 'Phone number', 'Choose device', 'Choose repairs', 'Choose quality', 'Add address', 'Pick date', 'Review details', 'Verify code']
    ), [isLoggedIn]);
    const maxStepIndex = quizSteps.length - 1;

    const goBack = () => setStep((s) => Math.max(s - 1, 0));
    const queueAutoAdvance = (expectedStep, canAdvance) => {
        if (autoAdvanceTimeoutRef.current) {
            window.clearTimeout(autoAdvanceTimeoutRef.current);
        }
        autoAdvanceTimeoutRef.current = window.setTimeout(() => {
            setStep((current) => {
                if (current !== expectedStep || !canAdvance()) return current;
                const next = Math.min(current + 1, maxStepIndex);
                analytics.quizStep(quizSteps[next], { from: current, to: next, click_count: clickCount });
                return next;
            });
        }, 170);
    };

    useEffect(() => {
        setStep((current) => Math.min(current, maxStepIndex));
    }, [maxStepIndex]);

    useEffect(() => () => {
        if (autoAdvanceTimeoutRef.current) {
            window.clearTimeout(autoAdvanceTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        if (selectedIssues.length > 0) {
            setPricePulseKey((k) => k + 1);
        }
    }, [selectedDevice, selectedIssues, issueTiers]);

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
                backupPhone: '',
            });
            setOwnReferralCode(normalizeReferralCode(profile?.referral_code || ''));
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

    const buildBookingNotes = () => {
        const customNotes = repairNotes.trim();
        const backupPhone = contact.backupPhone.trim();
        if (!customNotes && !backupPhone) return null;

        const segments = [];
        if (customNotes) segments.push(customNotes);
        if (backupPhone) segments.push(`Backup phone: ${backupPhone}`);
        return segments.join('\n\n');
    };

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
            setStep(STEP_VERIFY);
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
                    p_notes: buildBookingNotes(),
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
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues, click_count: clickCount });
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
                p_notes: buildBookingNotes(),
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
            analytics.quizComplete({ device: selectedDevice?.name, issues: selectedIssues, click_count: clickCount });
        } catch (err) {
            setAuthError(`Failed to book your repair. ${err?.message ? `(${err.message})` : 'Please try again.'}`);
            console.error('Unexpected booking error for signed-in user:', err);
            setIsVerifying(false);
        }
    };

    const handleDateChange = (date) => {
        setScheduleDate(date);
        setScheduleTime('');
        queueAutoAdvance(STEP_DATE, () => Boolean(date) && (!filteredAvailableDates || filteredAvailableDates.has(date)));
    };

    const handleAddressChange = (address) => {
        setScheduleAddress(address);
        queueAutoAdvance(STEP_ADDRESS, () => canContinueFromAddressRef.current);
    };

    const handleScheduleWindowNext = () => {
        setScheduleWindowOffsetWeeks((prev) => Math.min(prev + 1, maxWindowOffsetWeeks));
    };

    const handleScheduleWindowPrev = () => {
        setScheduleWindowOffsetWeeks((prev) => Math.max(prev - 1, 0));
    };

    const sortedGens = [...DEVICE_GENERATIONS].reverse();
    const requiresBackGlassColor = selectedIssues.includes('back-glass');
    const allTiersSelected = selectedIssues.length > 0 && selectedIssues.every((id) => issueTiers[id]);
    const canContinueFromContact = Boolean(contact.name.trim()) && Boolean(contact.email.trim());
    const canContinueFromPhone = true; // phone is optional, always can continue
    const canContinueFromDevice = Boolean(selectedDevice);
    const canContinueFromIssues = selectedIssues.length > 0 && !isSoftwareOnly;
    const canContinueFromQuality = canContinueFromIssues && allTiersSelected && (!requiresBackGlassColor || Boolean(backGlassColor));
    const canContinueFromAddress = Boolean(scheduleAddress) && !serviceAreaError;
    const canContinueFromDate = Boolean(scheduleDate) && (!filteredAvailableDates || filteredAvailableDates.has(scheduleDate));
    const progressPercent = ((Math.min(step, maxStepIndex) + 1) / quizSteps.length) * 100;

    useEffect(() => {
        canContinueFromContactRef.current = canContinueFromContact;
        canContinueFromPhoneRef.current = canContinueFromPhone;
        canContinueFromDeviceRef.current = canContinueFromDevice;
        canContinueFromIssuesRef.current = canContinueFromIssues;
        canContinueFromQualityRef.current = canContinueFromQuality;
        canContinueFromAddressRef.current = canContinueFromAddress;
        canContinueFromDateRef.current = canContinueFromDate;
    }, [canContinueFromContact, canContinueFromPhone, canContinueFromDevice, canContinueFromIssues, canContinueFromQuality, canContinueFromAddress, canContinueFromDate]);

    useEffect(() => {
        if (step === STEP_DEVICE && canContinueFromDevice) {
            queueAutoAdvance(STEP_DEVICE, () => canContinueFromDeviceRef.current);
        }
        if (step === STEP_ISSUES && canContinueFromIssues) {
            queueAutoAdvance(STEP_ISSUES, () => canContinueFromIssuesRef.current);
        }
        if (step === STEP_QUALITY && canContinueFromQuality) {
            queueAutoAdvance(STEP_QUALITY, () => canContinueFromQualityRef.current);
        }
        if (step === STEP_ADDRESS && canContinueFromAddress) {
            queueAutoAdvance(STEP_ADDRESS, () => canContinueFromAddressRef.current);
        }
        if (step === STEP_DATE && canContinueFromDate) {
            queueAutoAdvance(STEP_DATE, () => canContinueFromDateRef.current);
        }
    }, [
        step,
        canContinueFromDevice,
        canContinueFromIssues,
        canContinueFromQuality,
        canContinueFromAddress,
        canContinueFromDate,
    ]);

    return (
        <>
            <Navbar />
            <div
                className="quiz"
                onClickCapture={(event) => {
                    if (!(event.target instanceof Element)) return;
                    if (!event.target.closest('button')) return;
                    setClickCount((count) => count + 1);
                }}
            >
                <div className="guru-container guru-container--narrow">
                    {/* ─── Progress Bar ─────────── */}
                    <div className="quiz__progress">
                        <div className="quiz__progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressPercent)}>
                            <div className="quiz__progress-fill" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <span className="quiz__progress-label">{quizSteps[Math.min(step, maxStepIndex)]}</span>
                        <span className="quiz__progress-label">Clicks this booking: {clickCount}</span>
                    </div>

                    {!confirmed && (
                        <div key={`step-${step}`} className="quiz__step-stage">
                            {step === STEP_CONTACT && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <h2 className="quiz__title">What's your name and email?</h2>
                                    <p className="quiz__subtitle">So we can send you booking confirmations and updates.</p>
                                    <div className="guru-input-group" style={{ marginBottom: 12 }}>
                                        <label className="sched-label">Full Name</label>
                                        <input
                                            className="guru-input"
                                            type="text"
                                            placeholder="Jane Doe"
                                            value={contact.name}
                                            onChange={(e) => handleContactChange('name', e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="guru-input-group">
                                        <label className="sched-label">Email Address</label>
                                        <input
                                            className="guru-input"
                                            type="email"
                                            placeholder="jane@example.com"
                                            value={contact.email}
                                            onChange={(e) => handleContactChange('email', e.target.value)}
                                        />
                                    </div>
                                    <div className="quiz__actions">
                                        <Link to="/" className="guru-btn guru-btn--ghost">← Back</Link>
                                        <button
                                            className="guru-btn guru-btn--primary guru-btn--lg"
                                            disabled={!canContinueFromContact}
                                            onClick={() => setStep(STEP_PHONE)}
                                        >
                                            Continue →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === STEP_PHONE && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <h2 className="quiz__title">What's your phone number?</h2>
                                    <p className="quiz__subtitle">So your technician can reach you on repair day.</p>
                                    <div className="guru-input-group" style={{ marginBottom: 12 }}>
                                        <label className="sched-label">Primary Phone <span style={{ color: 'var(--guru-gray-400)', fontWeight: 400 }}>(optional)</span></label>
                                        <input
                                            className="guru-input"
                                            type="tel"
                                            placeholder="(555) 123-4567"
                                            value={contact.phone}
                                            onChange={(e) => handleContactChange('phone', e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="guru-input-group">
                                        <label className="sched-label">Backup Phone <span style={{ color: 'var(--guru-gray-400)', fontWeight: 400 }}>(if we can't reach your primary)</span></label>
                                        <input
                                            className="guru-input"
                                            type="tel"
                                            placeholder="(555) 987-6543"
                                            value={contact.backupPhone}
                                            onChange={(e) => handleContactChange('backupPhone', e.target.value)}
                                        />
                                    </div>
                                    <div className="quiz__actions">
                                        <button className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                        <button
                                            className="guru-btn guru-btn--primary guru-btn--lg"
                                            onClick={() => setStep(STEP_DEVICE)}
                                        >
                                            Continue →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === STEP_DEVICE && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <h2 className="quiz__title">Choose your iPhone</h2>
                                    <p className="quiz__subtitle">Pick the device you need repaired.</p>

                                    <DeviceStep
                                        activeGen={activeGen}
                                        onGenChange={setActiveGen}
                                        selectedDevice={selectedDevice}
                                        onSelectDevice={setSelectedDevice}
                                        sortedGens={sortedGens}
                                        savedDevices={savedDevices}
                                        onSelectSavedDevice={(saved) => {
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
                                        onAutoAdvance={() => queueAutoAdvance(STEP_DEVICE, () => canContinueFromDeviceRef.current)}
                                    />

                                    <div className="quiz__actions">
                                        <button className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                    </div>
                                </div>
                            )}

                            {step === STEP_ISSUES && selectedDevice && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <h2 className="quiz__title">What needs fixing?</h2>
                                    <p className="quiz__subtitle">Select the repair types for your device.</p>
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
                                        onAutoAdvance={() => queueAutoAdvance(STEP_ISSUES, () => canContinueFromIssuesRef.current)}
                                        showIssueSelection={true}
                                        showColorSelection={false}
                                        showTierSelection={false}
                                    />
                                    <div className="quiz__actions">
                                        <button className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                    </div>
                                </div>
                            )}

                            {step === STEP_QUALITY && selectedDevice && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <h2 className="quiz__title">Choose parts quality</h2>
                                    <p className="quiz__subtitle">Pick quality tiers for each selected repair.</p>
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
                                        onAutoAdvance={() => queueAutoAdvance(STEP_QUALITY, () => canContinueFromQualityRef.current)}
                                        showIssueSelection={false}
                                        showColorSelection={true}
                                        showTierSelection={true}
                                    />
                                    <div className="quiz__actions">
                                        <button className="guru-btn guru-btn--ghost" onClick={goBack}>← Back</button>
                                    </div>
                                </div>
                            )}

                            {step === STEP_ADDRESS && (
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
                                    savedAddresses={savedAddresses}
                                    canGoPrevWindow={scheduleWindowOffsetWeeks > 0}
                                    canGoNextWindow={scheduleWindowOffsetWeeks < maxWindowOffsetWeeks}
                                    onPrevWindow={handleScheduleWindowPrev}
                                    onNextWindow={handleScheduleWindowNext}
                                    showAddressSection={true}
                                    showDateSection={false}
                                    onAutoAdvance={() => queueAutoAdvance(STEP_ADDRESS, () => canContinueFromAddressRef.current)}
                                    title="Where should we meet you?"
                                    subtitle="Enter a service address in our current Texas coverage area."
                                    showNextButton={false}
                                />
                            )}

                            {step === STEP_DATE && (
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
                                    savedAddresses={savedAddresses}
                                    canGoPrevWindow={scheduleWindowOffsetWeeks > 0}
                                    canGoNextWindow={scheduleWindowOffsetWeeks < maxWindowOffsetWeeks}
                                    onPrevWindow={handleScheduleWindowPrev}
                                    onNextWindow={handleScheduleWindowNext}
                                    showAddressSection={false}
                                    showDateSection={true}
                                    onAutoAdvance={() => queueAutoAdvance(STEP_DATE, () => canContinueFromDateRef.current)}
                                    title="Pick your preferred date"
                                    subtitle="Choose an available day and we will confirm your exact arrival window."
                                    showNextButton={false}
                                    dateSectionRef={null}
                                />
                            )}

                            {step === STEP_REVIEW && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <ReviewStep
                                        isLoggedIn={isLoggedIn}
                                        selectedDevice={selectedDevice}
                                        selectedIssues={selectedIssues}
                                        issueTiers={issueTiers}
                                        backGlassColor={backGlassColor}
                                        scheduleDate={scheduleDate}
                                        scheduleTime={scheduleTime}
                                        scheduleAddress={scheduleAddress}
                                        repairNotes={repairNotes}
                                        contact={contact}
                                        userEmail={user?.email}
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
                                        onBack={goBack}
                                        onBook={handleBookLoggedIn}
                                        onSendOtp={handleSendOtp}
                                    />
                                </div>
                            )}

                            {step === STEP_VERIFY && !isLoggedIn && otpSent && (
                                <div className="quiz__panel quiz__panel--transition">
                                    <AuthStep
                                        contactEmail={contact.email}
                                        otpCode={otpCode}
                                        authError={authError}
                                        isVerifying={isVerifying}
                                        otpRefs={otpRefs}
                                        onOtpChange={handleOtpChange}
                                        onOtpKeyDown={handleOtpKeyDown}
                                        onOtpPaste={handleOtpPaste}
                                        onEditInfo={() => {
                                            setOtpSent(false);
                                            setOtpCode(['', '', '', '', '', '']);
                                            setStep(STEP_REVIEW);
                                        }}
                                        onVerify={handleVerifyAndBook}
                                    />
                                </div>
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
                            <div className="quiz__warranty-notice confirm__payment-notice">
                                <strong>Payment reminder:</strong> We currently accept cash, Zelle, Cash App, and Venmo only.
                                Card payments are coming soon. This applies when payment is collected after your repair is completed.
                            </div>
                            <Link to="/dashboard" className="guru-btn guru-btn--primary guru-btn--lg" style={{ marginTop: 16 }}>
                                View My Repairs
                            </Link>
                        </div>
                    )}

                    {/* ─── Live Pricing Footer ─────── */}
                    {selectedIssues.length > 0 && !confirmed && step >= STEP_DEVICE && step <= STEP_DATE && (
                        <div className="quiz__price-footer">
                            <div className="quiz__price-footer-inner">
                                <div className="quiz__price-footer-label">
                                    Estimated Total
                                    <span className="quiz__price-footer-items">
                                        {selectedIssues.length} repair{selectedIssues.length > 1 ? 's' : ''} + labor + service fee
                                    </span>
                                    <span className="quiz__price-footer-hype">One step at a time - review before booking.</span>
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

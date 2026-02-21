/**
 * Guru — Shared Constants
 * Single source of truth for devices, repair types, tiers, and statuses.
 */

// ─── iPhone Device Catalog ───────────────────────────────────────────────────

export const DEVICES = [
    { id: 'iphone-11-pro', name: 'iPhone 11 Pro', year: 2019, generation: '11' },
    { id: 'iphone-11-pro-max', name: 'iPhone 11 Pro Max', year: 2019, generation: '11' },
    { id: 'iphone-se-2nd', name: 'iPhone SE (2nd gen)', year: 2020, generation: 'SE' },
    { id: 'iphone-12-mini', name: 'iPhone 12 mini', year: 2020, generation: '12' },
    { id: 'iphone-12', name: 'iPhone 12', year: 2020, generation: '12' },
    { id: 'iphone-12-pro', name: 'iPhone 12 Pro', year: 2020, generation: '12' },
    { id: 'iphone-12-pro-max', name: 'iPhone 12 Pro Max', year: 2020, generation: '12' },
    { id: 'iphone-13-mini', name: 'iPhone 13 mini', year: 2021, generation: '13' },
    { id: 'iphone-13', name: 'iPhone 13', year: 2021, generation: '13' },
    { id: 'iphone-13-pro', name: 'iPhone 13 Pro', year: 2021, generation: '13' },
    { id: 'iphone-13-pro-max', name: 'iPhone 13 Pro Max', year: 2021, generation: '13' },
    { id: 'iphone-se-3rd', name: 'iPhone SE (3rd gen)', year: 2022, generation: 'SE' },
    { id: 'iphone-14', name: 'iPhone 14', year: 2022, generation: '14' },
    { id: 'iphone-14-plus', name: 'iPhone 14 Plus', year: 2022, generation: '14' },
    { id: 'iphone-14-pro', name: 'iPhone 14 Pro', year: 2022, generation: '14' },
    { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', year: 2022, generation: '14' },
    { id: 'iphone-15', name: 'iPhone 15', year: 2023, generation: '15' },
    { id: 'iphone-15-plus', name: 'iPhone 15 Plus', year: 2023, generation: '15' },
    { id: 'iphone-15-pro', name: 'iPhone 15 Pro', year: 2023, generation: '15' },
    { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', year: 2023, generation: '15' },
    { id: 'iphone-16', name: 'iPhone 16', year: 2024, generation: '16' },
    { id: 'iphone-16-plus', name: 'iPhone 16 Plus', year: 2024, generation: '16' },
    { id: 'iphone-16-pro', name: 'iPhone 16 Pro', year: 2024, generation: '16' },
    { id: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', year: 2024, generation: '16' },
    { id: 'iphone-16e', name: 'iPhone 16e', year: 2025, generation: '16' },
    { id: 'iphone-17', name: 'iPhone 17', year: 2025, generation: '17' },
    { id: 'iphone-17-air', name: 'iPhone 17 Air', year: 2025, generation: '17' },
    { id: 'iphone-17-pro', name: 'iPhone 17 Pro', year: 2025, generation: '17' },
    { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', year: 2025, generation: '17' },
];

// Group devices by generation for UI display
export const DEVICE_GENERATIONS = [...new Set(DEVICES.map(d => d.generation))];

export const getDevicesByGeneration = (gen) => DEVICES.filter(d => d.generation === gen);

// ─── Repair Types ────────────────────────────────────────────────────────────

export const REPAIR_TYPES = [
    { id: 'screen', name: 'Screen Replacement', icon: '📱', description: 'Cracked, shattered, or unresponsive display' },
    { id: 'battery', name: 'Battery Replacement', icon: '🔋', description: 'Poor battery life or swollen battery' },
    { id: 'back-glass', name: 'Back Glass', icon: '🪟', description: 'Cracked or shattered back panel' },
    { id: 'camera-rear', name: 'Rear Camera', icon: '📸', description: 'Blurry, cracked, or non-functional rear camera' },
    { id: 'camera-front', name: 'Front Camera', icon: '🤳', description: 'Blurry or non-functional front camera / Face ID' },
];

// ─── Parts Tiers ─────────────────────────────────────────────────────────────

export const PARTS_TIERS = [
    {
        id: 'economy',
        tier: 1,
        name: 'Economy',
        label: 'Budget-Friendly',
        description: 'Functional aftermarket parts. Gets the job done at the lowest cost.',
        priceLabel: '$',
        color: '#22C55E',
    },
    {
        id: 'premium',
        tier: 2,
        name: 'Premium',
        label: 'Recommended',
        description: 'High-quality parts with reliable performance and durability.',
        priceLabel: '$$',
        color: '#7C3AED',
    },
    {
        id: 'genuine',
        tier: 3,
        name: 'Genuine Apple',
        label: 'Best Quality',
        description: 'Apple-certified OEM parts. Original quality guaranteed.',
        priceLabel: '$$$',
        color: '#F59E0B',
    },
];

// ─── Repair Statuses ─────────────────────────────────────────────────────────

export const REPAIR_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PARTS_ORDERED: 'parts_ordered',
    PARTS_RECEIVED: 'parts_received',
    SCHEDULED: 'scheduled',
    EN_ROUTE: 'en_route',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    CANCELLED: 'cancelled',
};

export const REPAIR_STATUS_LABELS = {
    [REPAIR_STATUS.PENDING]: 'Pending Review',
    [REPAIR_STATUS.CONFIRMED]: 'Confirmed',
    [REPAIR_STATUS.PARTS_ORDERED]: 'Parts Ordered',
    [REPAIR_STATUS.PARTS_RECEIVED]: 'Parts Received',
    [REPAIR_STATUS.SCHEDULED]: 'Scheduled',
    [REPAIR_STATUS.EN_ROUTE]: 'Technician En Route',
    [REPAIR_STATUS.ARRIVED]: 'Technician Arrived',
    [REPAIR_STATUS.IN_PROGRESS]: 'Repair In Progress',
    [REPAIR_STATUS.COMPLETE]: 'Repair Complete',
    [REPAIR_STATUS.CANCELLED]: 'Cancelled',
};

export const REPAIR_STATUS_FLOW = [
    REPAIR_STATUS.PENDING,
    REPAIR_STATUS.CONFIRMED,
    REPAIR_STATUS.PARTS_ORDERED,
    REPAIR_STATUS.PARTS_RECEIVED,
    REPAIR_STATUS.SCHEDULED,
    REPAIR_STATUS.EN_ROUTE,
    REPAIR_STATUS.ARRIVED,
    REPAIR_STATUS.IN_PROGRESS,
    REPAIR_STATUS.COMPLETE,
];

/**
 * Get the repair status flow based on whether parts are in stock.
 * When parts are in stock, skip parts_ordered and parts_received steps.
 * @param {boolean|null} partsInStock - true if all parts in stock, false if ordering needed, null for legacy
 */
export function getRepairStatusFlow(partsInStock) {
    if (partsInStock === true) {
        return REPAIR_STATUS_FLOW.filter(
            s => s !== REPAIR_STATUS.PARTS_ORDERED && s !== REPAIR_STATUS.PARTS_RECEIVED
        );
    }
    return REPAIR_STATUS_FLOW;
}

// ─── Notification Preferences ────────────────────────────────────────────────

export const NOTIFICATION_PREFERENCES = {
    EMAIL: 'email',
    SMS: 'sms',
    BOTH: 'both',
};

// ─── Scheduling ─────────────────────────────────────────────────────────────

export const SCHEDULING_LEAD_DAYS = 3; // Minimum days in advance for booking

export const TIME_SLOTS = [
    { id: 'morning', label: 'Morning', range: '8:00 AM – 12:00 PM', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', range: '12:00 PM – 4:00 PM', icon: '☀️' },
    { id: 'evening', label: 'Evening', range: '4:00 PM – 7:00 PM', icon: '🌆' },
];

export const SCHEDULING_WINDOW_DAYS = 90; // How far out customers can book

/**
 * Convert a Date to a local YYYY-MM-DD string (avoids UTC timezone shift).
 */
export function toLocalDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) to a human-readable form.
 * e.g. "Thursday, February 20, 2026"
 */
export function formatDisplayDate(isoDate) {
    const [y, m, d] = isoDate.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// ─── Back Glass Colors by Device ─────────────────────────────────────────────
// Official Apple release colors for back glass repair ordering.
// Only devices in BACK_GLASS_SUPPORTED_DEVICE_IDS need colors here.

export const BACK_GLASS_COLORS = {
    // ── iPhone 14 series (2022) ───────────────────────────────────────────────
    'iphone-14':          ['Blue', 'Midnight', 'Purple', '(Product)RED', 'Starlight', 'Yellow'],
    'iphone-14-plus':     ['Blue', 'Midnight', 'Purple', '(Product)RED', 'Starlight', 'Yellow'],
    'iphone-14-pro':      ['Deep Purple', 'Gold', 'Silver', 'Space Black'],
    'iphone-14-pro-max':  ['Deep Purple', 'Gold', 'Silver', 'Space Black'],

    // ── iPhone 15 series (2023) ───────────────────────────────────────────────
    'iphone-15':          ['Black', 'Blue', 'Green', 'Pink', 'Yellow'],
    'iphone-15-plus':     ['Black', 'Blue', 'Green', 'Pink', 'Yellow'],
    'iphone-15-pro':      ['Black Titanium', 'Blue Titanium', 'Natural Titanium', 'White Titanium'],
    'iphone-15-pro-max':  ['Black Titanium', 'Blue Titanium', 'Natural Titanium', 'White Titanium'],

    // ── iPhone 16 series (2024) ───────────────────────────────────────────────
    'iphone-16':          ['Black', 'Pink', 'Teal', 'Ultramarine', 'White'],
    'iphone-16-plus':     ['Black', 'Pink', 'Teal', 'Ultramarine', 'White'],
    'iphone-16-pro':      ['Black Titanium', 'Desert Titanium', 'Natural Titanium', 'White Titanium'],
    'iphone-16-pro-max':  ['Black Titanium', 'Desert Titanium', 'Natural Titanium', 'White Titanium'],
    'iphone-16e':         ['Black', 'White'],

    // ── iPhone 17 series (2025) ───────────────────────────────────────────────
    'iphone-17':          ['Black', 'White', 'Sky Blue', 'Pink'],
    'iphone-17-air':      ['Black', 'White', 'Sky Blue'],
    'iphone-17-pro':      ['Deep Blue', 'Orange', 'Silver'],
    'iphone-17-pro-max':  ['Deep Blue', 'Orange', 'Silver'],
};

// ─── Device-Specific Repair Pricing & Parts URLs ─────────────────────────────
// Keyed by device name → repair type id → tier id → { price, parts_url }
// Back glass tiers with color variants use: { price, parts_url: null, color_variants: [{color, parts_url}] }

export const DEVICE_REPAIR_PRICING = {
    'iPhone 17 Pro Max': {
        screen: {
            economy: { price: 100, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-17-pro-max-aftermarket-aq7-incell-120hz' },
            premium: { price: 200, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-17-pro-max-aftermarket-plus-soft-120hz' },
            genuine: { price: 380, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro-max/display' },
        },
        battery: {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-17-pro-max-genuine-oem-us-version' },
            genuine: { price: 120, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 110, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-17-pro-17-pro-max' },
            genuine: { price: 250, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-17-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro-max/front-camera' },
        },
        'back-glass': {
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro-max/back-glass' },
        },
    },
    'iPhone 17 Pro': {
        screen: {
            economy: { price: 100, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-17-pro-aftermarket-aq7-incell-120hz' },
            premium: { price: 180, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-17-pro-aftermarket-pro-xo7-soft-120hz' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro/display' },
        },
        battery: {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-17-pro-genuine-oem-us-version' },
            genuine: { price: 120, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 110, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-17-pro-17-pro-max' },
            genuine: { price: 250, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-17-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro/front-camera' },
        },
        'back-glass': {
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-17-pro/back-glass' },
        },
    },
    'iPhone 17 Air': {
        screen: {
            premium: { price: 210, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-air-aftermarket-pro-xo7-soft-120hz' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-air/display' },
        },
        battery: {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-air-genuine-oem' },
            genuine: { price: 120, parts_url: 'https://selfservicerepair.com/en-US/iphone-air/battery' },
        },
        'camera-rear': {
            premium: { price: 100, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-air' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-air/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-air' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-air/front-camera' },
        },
        'back-glass': {
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-air/back-glass' },
        },
    },
    'iPhone 17': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-17-aftermarket-aq7-incell-120hz' },
            premium: { price: 210, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-17-aftermarket-plus-soft-120hz' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-17/display' },
        },
        battery: {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-17-genuine-oem' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-17/battery' },
        },
        'camera-rear': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-17' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-17/camera' },
        },
        'camera-front': {
            premium: { price: 50, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-17' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-17/front-camera' },
        },
        'back-glass': {
            premium: { price: 160, parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-17-used-oem-pull-grade-a-lavender' },
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-17/back-glass' },
        },
    },
    'iPhone 16 Pro Max': {
        screen: {
            economy: { price: 130, parts_url: 'https://repairpartsusa.com/products/iphone-16-pro-max-grade-a-incell-lcd-and-digitizer-glass-screen-replacement' },
            premium: { price: 170, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-16-pro-max-aftermarket-pro-xo7-soft' },
            genuine: { price: 380, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro-max/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-pro-max-ampsentrix-basic' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-pro-max-ampsentrix-pro' },
            genuine: { price: 120, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-16-pro-max' },
            genuine: { price: 250, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-16-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro-max/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-max-no-logo-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-max-no-logo-white-titanium' },
                { color: 'Desert Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-max-no-logo-desert-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-max-no-logo-natural-titanium' },
            ]},
            premium: { price: 130, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-service-pack-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-service-pack-white-titanium' },
                { color: 'Desert Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-service-pack-desert-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-service-pack-natural-titanium' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro-max/back-glass' },
        },
    },
    'iPhone 16 Pro': {
        screen: {
            economy: { price: 120, parts_url: 'https://repairpartsusa.com/products/iphone-16-pro-grade-a-incell-lcd-and-digitizer-glass-screen-replacement' },
            premium: { price: 160, parts_url: 'https://repairpartsusa.com/products/iphone-16-pro-premium-soft-oled-and-glass-screen-replacement' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-pro-ampsentrix-basic' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-pro-oem-pull-grade-a' },
            genuine: { price: 120, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-16-pro' },
            genuine: { price: 250, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro/camera' },
        },
        'camera-front': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-16-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-no-logo-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-no-logo-white-titanium' },
                { color: 'Desert Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-no-logo-desert-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-no-logo-natural-titanium' },
            ]},
            premium: { price: 130, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-used-oem-pull-grade-b-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-used-oem-pull-grade-b-white-titanium' },
                { color: 'Desert Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-used-oem-pull-grade-b-desert-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-pro-used-oem-pull-grade-b-natural-titanium' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-pro/back-glass' },
        },
    },
    'iPhone 16 Plus': {
        screen: {
            economy: { price: 60, parts_url: 'https://repairpartsusa.com/products/iphone-16-plus-grade-a-incell-lcd-and-digitizer-glass-screen-replacement' },
            premium: { price: 130, parts_url: 'https://repairpartsusa.com/products/iphone-16-plus-premium-soft-oled-and-glass-screen-replacement' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-plus/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-plus-ampsentrix-basic' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-plus-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-plus/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-16-plus' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-plus/camera' },
        },
        'camera-front': {
            premium: { price: 50, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-16-plus' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-plus/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-16-plus-quality-oem-pull-c-white' },
                { color: 'Ultramarine', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-ultramarine' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-16-plus-quality-oem-pull-c-pink' },
                { color: 'Teal', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-plus-no-logo-teal' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-white' },
                { color: 'Ultramarine', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-ultramarine' },
                { color: 'Teal', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-teal' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-plus-used-oem-pull-grade-a-pink' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-16-plus/back-glass' },
        },
    },
    'iPhone 16': {
        screen: {
            economy: { price: 60, parts_url: 'https://repairpartsusa.com/products/iphone-16-grade-a-incell-lcd-and-digitizer-glass-screen-replacement' },
            premium: { price: 120, parts_url: 'https://repairpartsusa.com/products/iphone-16-premium-soft-oled-and-glass-screen-replacement' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-16/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-ampsentrix-basic' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-16/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-16' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-16/camera' },
        },
        'camera-front': {
            premium: { price: 50, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-16' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-16/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-b-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-no-logo-white' },
                { color: 'Ultramarine', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-b-ultramarine' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-b-pink' },
                { color: 'Teal', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-b-teal' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-a-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-a-white' },
                { color: 'Ultramarine', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-a-ultramarine' },
                { color: 'Teal', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-a-teal' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16-used-oem-pull-grade-a-pink' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-16/back-glass' },
        },
    },
    'iPhone 16e': {
        screen: {
            economy: { price: 50, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-16e-aftermarket-aq7-incell' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-16e-aftermarket-pro-xo7-soft' },
            genuine: { price: 230, parts_url: 'https://selfservicerepair.com/en-US/iphone-16e/display' },
        },
        battery: {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-16e-genuine-oem-1' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-16e/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-16e' },
            genuine: { price: 130, parts_url: 'https://selfservicerepair.com/en-US/iphone-16e/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-16e-original-used' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-16e/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-16e-quality-oem-pull-b-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-16e-quality-oem-pull-b-white' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16e-used-oem-pull-grade-a-black' },
                { color: 'White', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-16e-used-oem-pull-grade-a-white' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-16e/back-glass' },
        },
    },
    'iPhone 15 Pro Max': {
        screen: {
            economy: { price: 60, parts_url: 'https://repairpartsusa.com/products/iphone-15-pro-max-grade-a-incell-lcd-and-digitizer-glass-screen-replacement' },
            premium: { price: 120, parts_url: 'https://repairpartsusa.com/products/iphone-15-pro-max-premium-soft-oled-and-glass-screen-replacement' },
            genuine: { price: 380, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro-max/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-pro-max-ampsentrix-basic' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-pro-max-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-15-pro-max' },
            genuine: { price: 250, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-15-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro-max/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-15-pro-max-quality-oem-pull-c-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-15-pro-max-quality-oem-pull-c-white-titanium' },
                { color: 'Blue Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-15-pro-max-quality-oem-pull-c-blue-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-15-pro-max-quality-oem-pull-c-natural-titanium' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-max-used-oem-pull-grade-a-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-max-used-oem-pull-grade-a-white-titanium' },
                { color: 'Blue Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-max-used-oem-pull-grade-a-blue-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-max-used-oem-pull-grade-a-natural-titanium' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro-max/back-glass' },
        },
    },
    'iPhone 15 Pro': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-15-pro-aftermarket-aq7-incell-120hz' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-15-pro-aftermarket-pro-xo7-soft-120hz' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-pro-ampsentrix-plus' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-pro-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-15-pro' },
            genuine: { price: 220, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-15-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-pro-used-oem-pull-grade-b-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-pro-used-oem-pull-grade-b-white-titanium' },
                { color: 'Blue Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-pro-used-oem-pull-grade-b-blue-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-pro-used-oem-pull-grade-b-natural-titanium' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-pro-used-oem-pull-grade-b-black-titanium' },
                { color: 'White Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-used-oem-pull-grade-a-white-titanium' },
                { color: 'Blue Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-used-oem-pull-grade-a-blue-titanium' },
                { color: 'Natural Titanium', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-pro-used-oem-pull-grade-a-natural-titanium' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-pro/back-glass' },
        },
    },
    'iPhone 15 Plus': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-15-plus-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-15-plus-aftermarket-pro-xo7-soft' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-plus/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-15-plus-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-plus-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-plus/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-15-plus' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-plus/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-15-plus' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-plus/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-plus-no-logo-black' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-plus-no-logo-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-plus-no-logo-blue' },
                { color: 'Green', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-plus-no-logo-green' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-plus-no-logo-pink' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-plus-used-oem-pull-grade-b-black' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-for-iphone-15-plus-used-oem-pull-grade-a-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-for-iphone-15-plus-used-oem-pull-grade-a-blue' },
                { color: 'Green', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-for-iphone-15-plus-used-oem-pull-grade-a-green' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-for-iphone-15-plus-used-oem-pull-grade-a-pink' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-15-plus/back-glass' },
        },
    },
    'iPhone 15': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-15-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-15-aftermarket-pro-xo7-soft' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-15/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-15-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-15-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-15/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-15' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-15/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-15' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-15/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-black' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-blue' },
                { color: 'Green', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-green' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-pink' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Black', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-used-oem-pull-grade-b-black' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-for-iphone-15-no-logo-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-15-used-oem-pull-grade-b-blue' },
                { color: 'Green', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-15-quality-oem-pull-c-green' },
                { color: 'Pink', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-for-iphone-15-used-oem-pull-grade-a-pink' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-15/back-glass' },
        },
    },
    'iPhone 14 Pro Max': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-14-pro-max-aftermarket-aq7-incell-120hz' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-14-pro-max-aftermarket-pro-xo7-soft' },
            genuine: { price: 380, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro-max/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-14-pro-max-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-14-pro-max-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-14-pro-max' },
            genuine: { price: 220, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-14-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro-max/truedepth-camera' },
        },
    },
    'iPhone 14 Pro': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-14-pro-aftermarket-aq7-incell-120hz' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-14-pro-aftermarket-pro-xo7-soft-120hz' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-parts/apple/iphone-parts/iphone-14-pro' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-14-pro-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-14-pro' },
            genuine: { price: 220, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-14-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-pro/truedepth-camera' },
        },
    },
    'iPhone 14 Plus': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-14-plus-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-14-plus-aftermarket-pro-xo7-soft' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-plus/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-14-plus-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-14-plus-ampsentrix-pro' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-plus/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-14-plus' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-plus/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-14-plus' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-plus/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Midnight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-plus-used-oem-pull-grade-a-midnight' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-plus-used-oem-pull-grade-b-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-plus-used-oem-pull-grade-a-blue' },
                { color: 'Starlight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-plus-used-oem-pull-grade-a-starlight' },
                { color: '(Product)RED', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-14-plus-quality-oem-pull-c-red' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Midnight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-plus-used-oem-pull-grade-a-midnight' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-magsafe-magnet-pre-installed-compatible-for-iphone-14-plus-no-logo-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-plus-used-oem-pull-grade-a-blue' },
                { color: 'Purple', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-plus-service-pack-purple' },
                { color: 'Starlight', parts_url: 'https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-for-iphone-14-plus-service-pack-starlight' },
                { color: '(Product)RED', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-plus-service-pack-red' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-14-plus/back-glass' },
        },
    },
    'iPhone 14': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-14-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-14-aftermarket-pro-xo7-soft' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-14/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-14-ampsentrix-plus' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-14-ampsentrix' },
            genuine: { price: 100, parts_url: 'https://selfservicerepair.com/en-US/iphone-14/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-14' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-14/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-14' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-14/truedepth-camera' },
        },
        'back-glass': {
            economy: { price: 70, parts_url: null, color_variants: [
                { color: 'Midnight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-used-oem-pull-grade-a-midnight' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-used-oem-pull-grade-b-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-for-iphone-14-used-oem-pull-grade-a-blue' },
                { color: 'Purple', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-for-iphone-14-used-oem-pull-grade-a-purple' },
                { color: 'Starlight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-for-iphone-14-used-oem-pull-grade-a-starlight' },
                { color: '(Product)RED', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-for-iphone-14-used-oem-pull-grade-a-red' },
            ]},
            premium: { price: 120, parts_url: null, color_variants: [
                { color: 'Midnight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-service-pack-midnight' },
                { color: 'Yellow', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-compatible-for-iphone-14-used-oem-pull-grade-b-yellow' },
                { color: 'Blue', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-service-pack-blue' },
                { color: 'Purple', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-service-pack-purple' },
                { color: 'Starlight', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-for-iphone-14-used-oem-pull-grade-a-starlight' },
                { color: '(Product)RED', parts_url: 'https://www.mobilesentrix.com/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-14-service-pack-red' },
            ]},
            genuine: { price: 160, parts_url: 'https://selfservicerepair.com/en-US/iphone-14/back-glass' },
        },
    },
    'iPhone SE (3rd gen)': {
        screen: {
            economy: { price: 40, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-with-steel-plate-for-iphone-8-se-2020-aftermarket-black' },
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/black-lcd-assembly-for-iphone-8-premium' },
            genuine: { price: 130, parts_url: 'https://selfservicerepair.com/en-US/iphone-se-3rd-generation/display' },
        },
        battery: {
            economy: { price: 20, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-se-2022-ampsentrix-plus-extended' },
            premium: { price: 40, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-se-2022-ampsentrix-pro' },
            genuine: { price: 70, parts_url: 'https://selfservicerepair.com/en-US/iphone-se-3rd-generation/battery' },
        },
        'camera-rear': {
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-se-2020-premium' },
            genuine: { price: 80, parts_url: 'https://selfservicerepair.com/en-US/iphone-se-3rd-generation/camera' },
        },
    },
    'iPhone 13 Pro Max': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-13-pro-max-aftermarket-aq7-incell-120hz' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-13-pro-max-aftermarket-pro-xo7-soft' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro-max/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-13-pro-max-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-13-pro-max-ampsentrix' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-13-pro-13-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-13-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro-max/truedepth-camera' },
        },
    },
    'iPhone 13 Pro': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-compatible-for-iphone-13-pro-aftermarket-aq7-incell-120hz' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-compatible-for-iphone-13-pro-aftermarket-pro-xo7-soft-120hz' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-13-pro-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-13-pro-ampsentrix-pro' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-13-pro-13-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-13-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-pro/truedepth-camera' },
        },
    },
    'iPhone 13 mini': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-13-mini-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-13-mini-aftermarket-pro-xo7-soft' },
            genuine: { price: 230, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-mini/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-13-mini-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-13-mini-ampsentrix' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-mini/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-13-13-mini-service-pack' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-mini/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-13-mini' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13-mini/truedepth-camera' },
        },
    },
    'iPhone 13': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-13-aftermarket-aq7-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-13-aftermarket-pro-xo7-soft' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-13/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-13-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-13-ampsentrix' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-13/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-13-13-mini-service-pack' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-13/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-13' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-13/truedepth-camera' },
        },
    },
    'iPhone 12 Pro Max': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-12-pro-max-aftermarket-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-12-pro-max-aftermarket-pro-xo7-soft' },
            genuine: { price: 330, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro-max/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-12-pro-max-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-for-iphone-12-pro-max-ampsentrix' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro-max/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-12-pro-max' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro-max/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-12-pro-max' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro-max/truedepth-camera' },
        },
    },
    'iPhone 12 Pro': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-12-12-pro-aftermarket-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-12-12-pro-refurbished' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-12-12-pro-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/battery-for-iphone-12-premium' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-12-pro' },
            genuine: { price: 200, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-12-12-pro' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro/truedepth-camera' },
        },
    },
    'iPhone 12 mini': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-12-mini-aftermarket-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-12-mini-refurbished' },
            genuine: { price: 230, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-mini/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-12-mini-ampsentrix-plus' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-12-mini-ampsentrix-pro' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-mini/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-compatible-for-iphone-12-mini-premium' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-mini/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-compatible-for-iphone-12-mini' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12-pro/truedepth-camera' },
        },
    },
    'iPhone 12': {
        screen: {
            economy: { price: 60, parts_url: 'https://www.mobilesentrix.com/lcd-assembly-for-iphone-12-12-pro-aftermarket-incell' },
            premium: { price: 120, parts_url: 'https://www.mobilesentrix.com/oled-assembly-for-iphone-12-12-pro-refurbished' },
            genuine: { price: 280, parts_url: 'https://selfservicerepair.com/en-US/iphone-12/display' },
        },
        battery: {
            economy: { price: 30, parts_url: 'https://www.mobilesentrix.com/replacement-battery-compatible-for-iphone-12-12-pro-ampsentrix-plus-extended' },
            premium: { price: 60, parts_url: 'https://www.mobilesentrix.com/battery-for-iphone-12-premium' },
            genuine: { price: 90, parts_url: 'https://selfservicerepair.com/en-US/iphone-12/battery' },
        },
        'camera-rear': {
            premium: { price: 80, parts_url: 'https://www.mobilesentrix.com/back-camera-for-iphone-12' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12/camera' },
        },
        'camera-front': {
            premium: { price: 70, parts_url: 'https://www.mobilesentrix.com/front-camera-for-iphone-12-12-pro' },
            genuine: { price: 170, parts_url: 'https://selfservicerepair.com/en-US/iphone-12/truedepth-camera' },
        },
    },
};

/**
 * Get available tiers for a specific device + repair type combination.
 * Returns only tiers that have pricing data for that device.
 * Falls back to all PARTS_TIERS if device not found in DEVICE_REPAIR_PRICING.
 */
export function getAvailableTiersForRepair(deviceName, repairTypeId) {
    const deviceData = DEVICE_REPAIR_PRICING[deviceName];
    if (!deviceData || !deviceData[repairTypeId]) return null; // null = use fallback
    return Object.keys(deviceData[repairTypeId]); // e.g. ['economy', 'premium', 'genuine']
}

/**
 * Get the price for a specific device + repair type + tier combination.
 * Returns null if not found (caller should fall back to SAMPLE_PRICING).
 */
export function getDeviceRepairPrice(deviceName, repairTypeId, tierId) {
    return DEVICE_REPAIR_PRICING[deviceName]?.[repairTypeId]?.[tierId]?.price ?? null;
}

/**
 * Resolve the parts URL for a repair, handling color_variants for back glass.
 * deviceColor is the customer's selected color (e.g. 'Black Titanium').
 */
export function getPartsUrl(deviceName, repairTypeId, tierId, deviceColor) {
    const tierData = DEVICE_REPAIR_PRICING[deviceName]?.[repairTypeId]?.[tierId];
    if (!tierData) return null;
    if (tierData.parts_url) return tierData.parts_url;
    if (tierData.color_variants && deviceColor) {
        const match = tierData.color_variants.find(
            v => v.color.toLowerCase() === deviceColor.toLowerCase()
        );
        return match?.parts_url || tierData.color_variants[0]?.parts_url || null;
    }
    return null;
}

// ─── Service Fees ────────────────────────────────────────────────────────────

export const SERVICE_FEE = 29;

// ─── Labor Fee ───────────────────────────────────────────────────────────────

export const LABOR_FEE = 10;

// ─── Tip Presets ─────────────────────────────────────────────────────────────

export const TIP_PRESETS = [
    { label: 'No Tip', value: 0 },
    { label: '$5', value: 5 },
    { label: '$10', value: 10 },
    { label: '$15', value: 15 },
    { label: '$20', value: 20 },
];

// ─── Tax Rate (Texas) ───────────────────────────────────────────────────────

export const TAX_RATE = 0.0825; // 8.25% Texas sales tax

// ─── Sample Pricing (placeholder until database is wired) ────────────────────

export const SAMPLE_PRICING = {
    screen: { economy: 49, premium: 89, genuine: 179 },
    battery: { economy: 29, premium: 49, genuine: 89 },
    'back-glass': { economy: 39, premium: 69, genuine: 149 },
    'camera-rear': { economy: 49, premium: 79, genuine: 159 },
    'camera-front': { economy: 39, premium: 69, genuine: 129 },
};

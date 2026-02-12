/**
 * Guru — Shared Constants
 * Single source of truth for devices, repair types, tiers, and statuses.
 */

// ─── iPhone Device Catalog ───────────────────────────────────────────────────

export const DEVICES = [
    { id: 'iphone-11', name: 'iPhone 11', year: 2019, generation: '11' },
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
    { id: 'charging', name: 'Charging Port', icon: '🔌', description: 'Won\'t charge or loose connection' },
    { id: 'back-glass', name: 'Back Glass', icon: '🪟', description: 'Cracked or shattered back panel' },
    { id: 'camera-rear', name: 'Rear Camera', icon: '📸', description: 'Blurry, cracked, or non-functional rear camera' },
    { id: 'camera-front', name: 'Front Camera', icon: '🤳', description: 'Blurry or non-functional front camera / Face ID' },
    { id: 'speaker', name: 'Speaker / Microphone', icon: '🔊', description: 'Low volume, distorted, or no sound' },
    { id: 'water-damage', name: 'Water Damage', icon: '💧', description: 'Liquid exposure diagnosis and repair' },
    { id: 'buttons', name: 'Button Repair', icon: '⏏️', description: 'Power, volume, or mute switch issues' },
    { id: 'software', name: 'Software Issues', icon: '⚙️', description: 'Restore, update, or performance problems' },
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

// ─── Notification Preferences ────────────────────────────────────────────────

export const NOTIFICATION_PREFERENCES = {
    EMAIL: 'email',
    SMS: 'sms',
    BOTH: 'both',
};

// ─── Service Fees ────────────────────────────────────────────────────────────

export const SERVICE_FEE = 29;

// ─── Tax Rate (Texas) ───────────────────────────────────────────────────────

export const TAX_RATE = 0.0825; // 8.25% Texas sales tax

// ─── Sample Pricing (placeholder until database is wired) ────────────────────

export const SAMPLE_PRICING = {
    screen: { economy: 49, premium: 89, genuine: 179 },
    battery: { economy: 29, premium: 49, genuine: 89 },
    charging: { economy: 39, premium: 59, genuine: 99 },
    'back-glass': { economy: 39, premium: 69, genuine: 149 },
    'camera-rear': { economy: 49, premium: 79, genuine: 159 },
    'camera-front': { economy: 39, premium: 69, genuine: 129 },
    speaker: { economy: 29, premium: 49, genuine: 79 },
    'water-damage': { economy: 59, premium: 99, genuine: 149 },
    buttons: { economy: 29, premium: 49, genuine: 79 },
    software: { economy: 0, premium: 0, genuine: 0 },
};

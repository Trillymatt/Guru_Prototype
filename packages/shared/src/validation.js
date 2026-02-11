/**
 * Format a phone number to E.164 format for Twilio/Supabase.
 * Assumes US numbers if no country code provided.
 *
 * Examples:
 *   "(555) 123-4567"  → "+15551234567"
 *   "5551234567"      → "+15551234567"
 *   "+15551234567"    → "+15551234567"
 */
export function formatPhoneE164(phone) {
    // Strip everything except digits and leading +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Already in E.164
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // US number without country code
    const digits = cleaned.replace(/\D/g, '');

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    // Return as-is with + prefix if we can't determine format
    return `+${digits}`;
}

/**
 * Basic phone validation — must result in at least 10 digits
 */
export function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
}

/**
 * Basic email validation
 */
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

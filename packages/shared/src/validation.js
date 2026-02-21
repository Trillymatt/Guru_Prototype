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

    // Return null for unrecognized formats instead of guessing
    return null;
}

/**
 * Phone validation — must be 10 or 11 digits (US numbers).
 * Rejects numbers that are too short or too long.
 */
export function isValidPhone(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    // US: 10 digits, or 11 starting with 1
    if (digits.length === 10) return true;
    if (digits.length === 11 && digits.startsWith('1')) return true;
    return false;
}

/**
 * Email validation — requires valid format with 2+ char TLD.
 */
export function isValidEmail(email) {
    if (!email || email.length > 254) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

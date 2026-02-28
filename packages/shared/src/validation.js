/**
 * Format a phone number to E.164 format for Twilio/Supabase.
 * Assumes US numbers if no country code provided.
 *
 * Examples:
 *   "(555) 123-4567"  -> "+15551234567"
 *   "5551234567"      -> "+15551234567"
 *   "+15551234567"    -> "+15551234567"
 */
export function formatPhoneE164(phone) {
    if (!phone) return null;

    const cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
        const digits = cleaned.slice(1);
        if (digits.length >= 10 && digits.length <= 15 && /^\d+$/.test(digits)) {
            return cleaned;
        }
        return null;
    }

    const digits = cleaned.replace(/\D/g, '');

    if (digits.length === 10) {
        return `+1${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
    }

    return null;
}

/**
 * Phone validation — must be 10 or 11 digits (US numbers).
 * Rejects obviously invalid area codes.
 */
export function isValidPhone(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');

    let areaCode;
    if (digits.length === 10) {
        areaCode = digits.slice(0, 3);
    } else if (digits.length === 11 && digits.startsWith('1')) {
        areaCode = digits.slice(1, 4);
    } else {
        return false;
    }

    // Area codes can't start with 0 or 1, and can't be N11 (e.g. 911, 411)
    if (areaCode[0] === '0' || areaCode[0] === '1') return false;
    if (areaCode[1] === '1' && areaCode[2] === '1') return false;

    return true;
}

/**
 * Email validation — requires valid format with 2+ char TLD.
 * Rejects consecutive dots and leading/trailing dots in local part.
 */
export function isValidEmail(email) {
    if (!email || email.length > 254) return false;
    const [local, domain] = email.split('@');
    if (!local || !domain) return false;
    if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
    if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(email);
}

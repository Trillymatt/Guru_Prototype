// Shared package barrel export
export { supabase } from './supabase.js';
export * from './constants.js';
export { AuthProvider, useAuth } from './AuthProvider.jsx';
export { formatPhoneE164, isValidPhone, isValidEmail } from './validation.js';

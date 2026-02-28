// Shared package barrel export
export { supabase } from './supabase.js';
export * from './constants.js';
export { AuthProvider, useAuth } from './AuthProvider.jsx';
export { formatPhoneE164, isValidPhone, isValidEmail } from './validation.js';
export { analytics, initSessionTracking } from './analytics.js';
export { ErrorBoundary } from './ErrorBoundary.jsx';
export { default as RepairChat } from './RepairChat.jsx';
export { default as GuruCalendar } from './GuruCalendar.jsx';
export { default as LiveTrackingMap } from './LiveTrackingMap.jsx';
export { geocodeAddress } from './geocode.js';

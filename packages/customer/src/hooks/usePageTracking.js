import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analytics } from '@shared/analytics';

/**
 * Tracks page views automatically on route changes.
 * Place this once in App.jsx.
 */
export function usePageTracking() {
    const location = useLocation();

    useEffect(() => {
        analytics.pageView(location.pathname);
        // Ensure each route starts at the top in SPA navigation.
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [location.pathname]);
}

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
    }, [location.pathname]);
}

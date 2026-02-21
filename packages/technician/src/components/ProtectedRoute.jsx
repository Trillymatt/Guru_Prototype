import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';

/**
 * Wraps a route so only authenticated technicians can access it.
 * Verifies the user exists in the technicians table (role check).
 * Shows a loading spinner while checking auth state.
 * Redirects to "/login" if not authenticated or not a technician.
 */
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const [isTech, setIsTech] = useState(null); // null = checking, true/false = result

    useEffect(() => {
        if (!user) {
            setIsTech(false);
            return;
        }

        let cancelled = false;
        supabase
            .from('technicians')
            .select('id')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (!cancelled) {
                    setIsTech(!error && !!data);
                }
            });

        return () => { cancelled = true; };
    }, [user]);

    if (loading || (user && isTech === null)) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                color: '#737373',
                fontSize: '1rem',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>&#x23F3;</div>
                    Loading...
                </div>
            </div>
        );
    }

    if (!user || !isTech) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

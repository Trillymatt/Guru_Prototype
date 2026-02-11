import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';

/**
 * Wraps a route so only authenticated users can access it.
 * Shows a loading spinner while checking auth state.
 * Redirects to `redirectTo` (default "/login") if not authenticated.
 */
export default function ProtectedRoute({ children, redirectTo = '/login' }) {
    const { user, loading } = useAuth();

    if (loading) {
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
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                    Loading...
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}

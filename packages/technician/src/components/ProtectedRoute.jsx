import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';

/**
 * Wraps a route so only authenticated technicians can access it.
 * Shows a loading spinner while checking auth state.
 * Redirects to "/login" if not authenticated.
 */
export default function ProtectedRoute({ children }) {
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
        return <Navigate to="/login" replace />;
    }

    return children;
}

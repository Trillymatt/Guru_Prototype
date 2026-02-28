import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="protected-route-loading">
                <div className="protected-route-loading__spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}

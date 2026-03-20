import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';
import VanLoader from './VanLoader';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <VanLoader text="Checking your account..." />;
    }

    if (!user) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}

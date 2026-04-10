import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const [isTech, setIsTech] = useState(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;

        if (!user) {
            setIsTech(false);
            return;
        }

        supabase
            .from('technicians')
            .select('id')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (!cancelledRef.current) {
                    setIsTech(!error && !!data);
                }
            });

        return () => { cancelledRef.current = true; };
    }, [user]);

    if (loading || (user && isTech === null)) {
        return (
            <div className="protected-route-loading">
                <div className="protected-route-loading__spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    if (!user || !isTech) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

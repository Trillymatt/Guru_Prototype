import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabaseAdmin, hasSupabaseConfig } from './supabaseAdmin';
import LoginGate from './components/LoginGate';
import AdminLayout from './components/AdminLayout';
import JobsPage from './pages/JobsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import RevenuePage from './pages/RevenuePage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (!supabaseAdmin) {
            setLoading(false);
            return;
        }
        supabaseAdmin.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                setAuthError('Failed to load session');
                setLoading(false);
                return;
            }
            if (session?.user) {
                verifyAdmin(session.user);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange(
            (_event, session) => {
                if (session?.user) {
                    verifyAdmin(session.user);
                } else {
                    setUser(null);
                    setLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (!hasSupabaseConfig) {
        return (
            <div className="admin-login">
                <div className="admin-login__card">
                    <div className="admin-login__logo">GURU</div>
                    <h1 className="admin-login__title">Admin Setup Required</h1>
                    <p className="admin-login__subtitle">
                        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to{' '}
                        <code>packages/admin/.env</code> and restart the dev server.
                    </p>
                </div>
            </div>
        );
    }

    async function verifyAdmin(authUser) {
        const { data, error } = await supabaseAdmin
            .from('admins')
            .select('id')
            .eq('id', authUser.id)
            .maybeSingle();

        if (error || !data) {
            setAuthError('This account does not have admin access.');
            await supabaseAdmin.auth.signOut();
            setUser(null);
        } else {
            setUser(authUser);
            setAuthError('');
        }
        setLoading(false);
    }

    async function handleLogin(email, password) {
        setAuthError('');
        const { error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message);
            return false;
        }
        return true;
    }

    async function handleLogout() {
        await supabaseAdmin.auth.signOut();
        setUser(null);
    }

    if (loading) {
        return (
            <div className="admin-login">
                <div className="admin-login__card">
                    <div className="admin-login__logo">GURU</div>
                    <p className="admin-login__subtitle">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginGate onLogin={handleLogin} error={authError} />;
    }

    return (
        <AdminLayout onLogout={handleLogout} userEmail={user.email}>
            <Routes>
                <Route path="/" element={<Navigate to="/jobs" replace />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
                <Route path="/revenue" element={<RevenuePage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="*" element={<Navigate to="/jobs" replace />} />
            </Routes>
        </AdminLayout>
    );
}

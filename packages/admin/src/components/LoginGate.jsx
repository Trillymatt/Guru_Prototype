import React, { useState } from 'react';

export default function LoginGate({ onLogin, error: externalError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const displayError = externalError || error;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }
        setError('');
        setLoading(true);
        const success = await onLogin(email.trim(), password);
        if (!success) {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login">
            <div className="admin-login__card">
                <div className="admin-login__logo">GURU</div>
                <h1 className="admin-login__title">Admin Dashboard</h1>
                <p className="admin-login__subtitle">Sign in with your admin account</p>
                <p className="admin-login__hint">
                    Use the same email and password you created in Supabase (Authentication → Users). Your user must be listed in the <code>admins</code> table.
                </p>
                <form onSubmit={handleSubmit} className="admin-login__form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        placeholder="Email address"
                        className="admin-login__input"
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                        placeholder="Password"
                        className="admin-login__input"
                        autoComplete="current-password"
                        disabled={loading}
                    />
                    {displayError && <p className="admin-login__error">{displayError}</p>}
                    <button type="submit" className="admin-login__btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@shared/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setAuthError(error.message);
                setLoading(false);
                return;
            }

            setLoading(false);
            navigate('/queue');
        } catch (err) {
            setAuthError('Something went wrong. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="tech-login">
            <div className="tech-login__bg"></div>
            <div className="tech-login__card animate-scale-in">
                <div className="tech-login__logo">
                    <div className="navbar__logo-icon" style={{ width: 48, height: 48, fontSize: '1.5rem', background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', borderRadius: 12 }}>
                        G
                    </div>
                    <span className="tech-login__logo-text">Guru</span>
                    <span className="tech-nav__logo-badge">Tech</span>
                </div>
                <h1 className="tech-login__title">Technician Portal</h1>
                <p className="tech-login__subtitle">
                    Sign in to access your repair queue and manage jobs.
                </p>

                <form className="tech-login__form" onSubmit={handleSubmit}>
                    <div className="guru-input-group">
                        <label htmlFor="tech-email">Email</label>
                        <input
                            id="tech-email"
                            className="guru-input"
                            type="email"
                            placeholder="technician@guru.repair"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="guru-input-group">
                        <label htmlFor="tech-password">Password</label>
                        <input
                            id="tech-password"
                            className="guru-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {authError && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginBottom: 4 }}>{authError}</p>
                    )}
                    <button type="submit" className="guru-btn guru-btn--primary guru-btn--full guru-btn--lg" style={{ marginTop: 8 }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

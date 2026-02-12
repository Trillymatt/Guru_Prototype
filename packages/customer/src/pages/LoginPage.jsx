import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '@shared/supabase';
import '../styles/login.css';

export default function LoginPage() {
    const [step, setStep] = useState(1); // 1 = enter email, 2 = enter code
    const [contact, setContact] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [sending, setSending] = useState(false);
    const [authError, setAuthError] = useState('');
    const codeRefs = useRef([]);
    const navigate = useNavigate();

    const handleSendCode = async (e) => {
        e.preventDefault();
        if (!contact) return;
        setSending(true);
        setAuthError('');

        try {
            const payload = { email: contact };

            const { error } = await supabase.auth.signInWithOtp(payload);
            if (error) {
                setAuthError(error.message);
                setSending(false);
                return;
            }
            setSending(false);
            setStep(2);
        } catch (err) {
            setAuthError('Something went wrong. Please try again.');
            setSending(false);
        }
    };

    const handleCodeChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1); // only 1 char
        const next = [...code];
        next[index] = value;
        setCode(next);

        // Auto-advance to next input
        if (value && index < 5) {
            codeRefs.current[index + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            codeRefs.current[index - 1]?.focus();
        }
    };

    const handleCodePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const next = [...code];
        pasted.split('').forEach((char, i) => { next[i] = char; });
        setCode(next);
        const focusIdx = Math.min(pasted.length, 5);
        codeRefs.current[focusIdx]?.focus();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length < 6) return;
        setSending(true);
        setAuthError('');

        try {
            const payload = { email: contact, token: fullCode, type: 'email' };

            const { error } = await supabase.auth.verifyOtp(payload);
            if (error) {
                setAuthError(error.message);
                setSending(false);
                return;
            }
            setSending(false);
            navigate('/dashboard');
        } catch (err) {
            setAuthError('Verification failed. Check your code and try again.');
            setSending(false);
        }
    };

    const isCodeComplete = code.every(d => d !== '');

    return (
        <>
            <Navbar />
            <div className="login-page">
                <div className="login-card animate-scale-in">
                    <div className="login-card__logo">
                        <div className="login-card__logo-icon">G</div>
                    </div>

                    {step === 1 ? (
                        <>
                            <h1 className="login-card__title">Welcome to Guru</h1>
                            <p className="login-card__subtitle">
                                Enter your email and we'll send you a verification code.
                            </p>

                            {/* Social Logins */}
                            <div className="login-card__socials">
                                <button className="login-card__social-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Continue with Google
                                </button>
                                <button className="login-card__social-btn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                                    Continue with Apple
                                </button>
                            </div>

                            <div className="login-card__divider">
                                <span>or</span>
                            </div>

                            <form className="login-card__form" onSubmit={handleSendCode}>
                                <div className="guru-input-group">
                                    <input
                                        id="contact"
                                        className="guru-input guru-input--lg"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                {authError && (
                                    <p className="login-card__error">{authError}</p>
                                )}
                                <button
                                    type="submit"
                                    className="guru-btn guru-btn--primary guru-btn--full guru-btn--lg"
                                    disabled={!contact || sending}
                                >
                                    {sending ? 'Sending...' : 'Send Verification Code'}
                                </button>
                            </form>

                            <Link to="/" className="login-card__guest">
                                ← Back to Home
                            </Link>
                        </>
                    ) : (
                        <>
                            <h1 className="login-card__title">Enter your code</h1>
                            <p className="login-card__subtitle">
                                We sent a 6-digit code to{' '}
                                <strong>{contact}</strong>
                            </p>

                            <form className="login-card__form" onSubmit={handleVerify}>
                                <div className="otp-inputs" onPaste={handleCodePaste}>
                                    {code.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => codeRefs.current[i] = el}
                                            className="otp-input"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleCodeChange(i, e.target.value)}
                                            onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="guru-btn guru-btn--primary guru-btn--full guru-btn--lg"
                                    disabled={!isCodeComplete}
                                >
                                    Verify & Continue
                                </button>
                            </form>

                            <div className="login-card__footer">
                                <span>Didn't receive a code?{' '}</span>
                                <button className="login-card__switch" onClick={async () => {
                                    setCode(['', '', '', '', '', '']);
                                    setAuthError('');
                                    setSending(true);
                                    const payload = { email: contact };
                                    const { error } = await supabase.auth.signInWithOtp(payload);
                                    if (error) setAuthError(error.message);
                                    setSending(false);
                                }}>
                                    Resend
                                </button>
                                <span className="login-card__separator">·</span>
                                <button className="login-card__switch" onClick={() => { setStep(1); setCode(['', '', '', '', '', '']); }}>
                                    Change email
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

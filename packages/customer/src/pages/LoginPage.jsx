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

import React from 'react';

export default function AuthStep({
    contactEmail,
    otpCode,
    authError,
    isVerifying,
    otpRefs,
    onOtpChange,
    onOtpKeyDown,
    onOtpPaste,
    onEditInfo,
    onVerify,
}) {
    return (
        <>
            <h2 className="quiz__title">Enter verification code</h2>
            <p className="quiz__subtitle">
                We sent a 6-digit code to{' '}
                <strong>{contactEmail}</strong>.
            </p>

            <form onSubmit={onVerify}>
                <div className="otp-inputs" onPaste={onOtpPaste}>
                    {otpCode.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => otpRefs.current[i] = el}
                            className="otp-input"
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => onOtpChange(i, e.target.value)}
                            onKeyDown={(e) => onOtpKeyDown(i, e)}
                            autoFocus={i === 0}
                        />
                    ))}
                </div>
                {authError && (
                    <p className="login-card__error">{authError}</p>
                )}
                <div className="quiz__actions">
                    <button
                        type="button"
                        className="guru-btn guru-btn--ghost"
                        onClick={onEditInfo}
                    >
                        ← Edit Info
                    </button>
                    <button
                        type="submit"
                        className="guru-btn guru-btn--primary guru-btn--lg"
                        disabled={otpCode.some(d => !d) || isVerifying}
                    >
                        {isVerifying ? 'Booking...' : 'Confirm Appointment'}
                    </button>
                </div>
            </form>
        </>
    );
}

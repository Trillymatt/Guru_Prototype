import React from 'react';
import {
    REPAIR_TYPES,
    PARTS_TIERS,
    SERVICE_FEE,
    LABOR_FEE,
    TIME_SLOTS,
    formatDisplayDate,
} from '@shared/constants';

function QuoteSummary({
    selectedDevice,
    selectedIssues,
    issueTiers,
    backGlassColor,
    scheduleDate,
    scheduleTime,
    scheduleAddress,
    getIssuePrice,
    calculateTotal,
    referralDiscount,
}) {
    return (
        <div className="quiz__quote">
            <div className="quiz__quote-section">
                <div className="quiz__quote-label">Device</div>
                <div className="quiz__quote-value">{selectedDevice?.name}</div>
                {backGlassColor && (
                    <div className="quiz__quote-line">
                        <span>🎨 Back Glass Color</span>
                        <span className="quiz__quote-value" style={{ fontSize: 'var(--font-size-base)' }}>{backGlassColor}</span>
                    </div>
                )}
            </div>
            <div className="quiz__quote-section">
                <div className="quiz__quote-label">Repairs</div>
                {selectedIssues.map((issueId) => {
                    const type = REPAIR_TYPES.find((t) => t.id === issueId);
                    const tier = PARTS_TIERS.find((t) => t.id === issueTiers[issueId]);
                    const price = getIssuePrice(issueId);
                    return (
                        <div key={issueId} className="quiz__quote-line">
                            <span>{type?.icon} {type?.name}</span>
                            <span className="quiz__quote-line-right">
                                <span className="quiz__quote-tier-tag">{tier?.name}</span>
                                <span>${price}</span>
                            </span>
                        </div>
                    );
                })}
                <div className="quiz__quote-line">
                    <span>🔧 Labor</span>
                    <span className="quiz__quote-value">${LABOR_FEE}</span>
                </div>
                <div className="quiz__quote-line">
                    <span>🚗 On-site Service Fee</span>
                    <span className="quiz__quote-value">${SERVICE_FEE}</span>
                </div>
                {referralDiscount > 0 && (
                    <div className="quiz__quote-line quiz__quote-line--discount">
                        <span>🎁 Referral Discount</span>
                        <span className="quiz__quote-value">-${referralDiscount}</span>
                    </div>
                )}
            </div>
            <div className="quiz__quote-section">
                <div className="quiz__quote-label">Appointment</div>
                <div className="quiz__quote-line">
                    <span>📅 {scheduleDate ? formatDisplayDate(scheduleDate) : ''}</span>
                </div>
                <div className="quiz__quote-line">
                    <span>🕐 {TIME_SLOTS.find(s => s.id === scheduleTime)?.range || 'To be scheduled after parts arrive'}</span>
                </div>
                <div className="quiz__quote-line">
                    <span>📍 {scheduleAddress}</span>
                </div>
            </div>
            <div className="quiz__quote-total">
                <span>Estimated Total</span>
                <span className="quiz__quote-total-price">${calculateTotal()}</span>
            </div>
        </div>
    );
}

function ReferralSection({
    referralCode,
    ownReferralCode,
    referralCodeError,
    onReferralCodeChange,
}) {
    return (
        <div className="quiz__section">
            <h3 className="quiz__section-title">Referral Code</h3>
            <p className="quiz__subtitle" style={{ marginBottom: 8 }}>
                Friend discount: <strong>$5 off</strong> their next repair.
            </p>
            <input
                className="guru-input"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={8}
                placeholder="Enter 8-character code"
                value={referralCode}
                onChange={(e) => onReferralCodeChange(e.target.value)}
                aria-label="Referral code"
            />
            {ownReferralCode && (
                <p className="sched-hint" style={{ marginTop: 8 }}>
                    Your referral code is <strong>{ownReferralCode}</strong>. You cannot use your own code.
                </p>
            )}
            {referralCodeError && (
                <p className="login-card__error" style={{ marginTop: 8 }}>{referralCodeError}</p>
            )}
        </div>
    );
}

function NotesSection({ repairNotes, onRepairNotesChange }) {
    return (
        <div className="quiz__section">
            <h3 className="quiz__section-title">Additional Notes</h3>
            <p className="quiz__subtitle" style={{ marginBottom: 8 }}>
                Anything else the technician should know? (Optional)
            </p>
            <textarea
                className="guru-input"
                style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', fontSize: 'var(--font-size-base)' }}
                placeholder="e.g. The screen flickers when it gets warm. The power button sticks."
                value={repairNotes}
                onChange={(e) => onRepairNotesChange(e.target.value)}
                maxLength={500}
            />
            {repairNotes.length > 400 && (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {500 - repairNotes.length} characters remaining
                </p>
            )}
        </div>
    );
}

function PaymentNotice() {
    return (
        <div className="quiz__warranty-notice" style={{ marginBottom: 16 }}>
            <strong>Payment Notice:</strong> We are currently accepting <strong>cash, Zelle, Cash App, and Venmo only</strong>.
            Card payments are coming soon as we prepare for launch.
        </div>
    );
}

export default function ReviewStep({
    isLoggedIn,
    selectedDevice,
    selectedIssues,
    issueTiers,
    backGlassColor,
    scheduleDate,
    scheduleTime,
    scheduleAddress,
    repairNotes,
    contact,
    userEmail,
    authError,
    isVerifying,
    getIssuePrice,
    calculateTotal,
    referralDiscountPreview,
    referralCode,
    ownReferralCode,
    referralCodeError,
    onRepairNotesChange,
    onReferralCodeChange,
    onBack,
    onBook,
    onSendOtp,
}) {
    const quoteProps = {
        selectedDevice,
        selectedIssues,
        issueTiers,
        backGlassColor,
        scheduleDate,
        scheduleTime,
        scheduleAddress,
        getIssuePrice,
        calculateTotal,
        referralDiscount: referralDiscountPreview || 0,
    };

    if (isLoggedIn) {
        return (
            <>
                <h2 className="quiz__title">Confirm & book</h2>
                <p className="quiz__subtitle">Review your repair and confirm your appointment.</p>

                <QuoteSummary {...quoteProps} />
                <NotesSection repairNotes={repairNotes} onRepairNotesChange={onRepairNotesChange} />
                <ReferralSection
                    referralCode={referralCode}
                    ownReferralCode={ownReferralCode}
                    referralCodeError={referralCodeError}
                    onReferralCodeChange={onReferralCodeChange}
                />

                <div className="quiz__section">
                    <h3 className="quiz__section-title">Signed in account</h3>
                    <p className="quiz__subtitle" style={{ marginBottom: 16 }}>
                        Booking as <strong>{contact.email || userEmail}</strong>.
                    </p>
                    {authError && (
                        <p className="login-card__error">{authError}</p>
                    )}
                    <PaymentNotice />
                    <div className="quiz__warranty-notice" style={{ marginBottom: 16 }}>
                        <strong>Note:</strong> Repairs do not include a warranty on parts or service.
                        Prices are estimates. Final pricing confirmed after technician diagnosis.
                    </div>
                    <div className="quiz__actions">
                        <button type="button" className="guru-btn guru-btn--ghost" onClick={onBack}>← Back</button>
                        <button
                            type="button"
                            className="guru-btn guru-btn--primary guru-btn--lg"
                            disabled={isVerifying}
                            onClick={onBook}
                        >
                            {isVerifying ? 'Booking...' : 'Confirm Appointment'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <h2 className="quiz__title">Confirm & book</h2>
            <p className="quiz__subtitle">Review your repair and enter your details to book.</p>

            <QuoteSummary {...quoteProps} />
            <NotesSection repairNotes={repairNotes} onRepairNotesChange={onRepairNotesChange} />
            <ReferralSection
                referralCode={referralCode}
                ownReferralCode={ownReferralCode}
                referralCodeError={referralCodeError}
                onReferralCodeChange={onReferralCodeChange}
            />

            <div className="quiz__section">
                <h3 className="quiz__section-title">Your contact details</h3>
                <form onSubmit={onSendOtp}>
                    <div className="quiz__quote" style={{ marginBottom: 16 }}>
                        <div className="quiz__quote-line">
                            <span>Name</span>
                            <span>{contact.name || 'Not provided'}</span>
                        </div>
                        <div className="quiz__quote-line">
                            <span>Email</span>
                            <span>{contact.email || 'Not provided'}</span>
                        </div>
                        <div className="quiz__quote-line">
                            <span>Primary Phone</span>
                            <span>{contact.phone || 'Not provided'}</span>
                        </div>
                        <div className="quiz__quote-line">
                            <span>Backup Phone</span>
                            <span>{contact.backupPhone || 'Not provided'}</span>
                        </div>
                    </div>
                    {authError && (
                        <p className="login-card__error">{authError}</p>
                    )}
                    <PaymentNotice />
                    <div className="quiz__warranty-notice" style={{ marginBottom: 16 }}>
                        <strong>Note:</strong> Repairs do not include a warranty on parts or service.
                        Prices are estimates. Final pricing confirmed after technician diagnosis.
                    </div>
                    <div className="quiz__actions">
                        <button type="button" className="guru-btn guru-btn--ghost" onClick={onBack}>← Back</button>
                        <button
                            type="submit"
                            className="guru-btn guru-btn--primary guru-btn--lg"
                            disabled={!contact.name || !contact.email || isVerifying}
                        >
                            {isVerifying ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

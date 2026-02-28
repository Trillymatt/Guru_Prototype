import React from 'react';
import {
    REPAIR_TYPES,
    PARTS_TIERS,
    SAMPLE_PRICING,
    BACK_GLASS_COLORS,
    getAvailableTiersForRepair,
    getDeviceRepairPrice,
} from '@shared/constants';

export default function IssuesStep({
    selectedDevice,
    selectedIssues,
    issueTiers,
    availableRepairTypes,
    backGlassColor,
    isSoftwareOnly,
    onToggleIssue,
    onSetTier,
    onSetBackGlassColor,
    isPartInStock,
}) {
    return (
        <>
            {/* Issue Selection */}
            <div className="quiz__section">
                <h3 className="quiz__section-title">What's wrong with your {selectedDevice.name}?</h3>
                <div className="quiz__issues">
                    {availableRepairTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`quiz__issue-card ${selectedIssues.includes(type.id) ? 'quiz__issue-card--selected' : ''}`}
                            onClick={() => onToggleIssue(type.id)}
                        >
                            <div className="quiz__issue-icon">{type.icon}</div>
                            <div className="quiz__issue-info">
                                <div className="quiz__issue-name">{type.name}</div>
                                <div className="quiz__issue-desc">{type.description}</div>
                            </div>
                            <div className="quiz__issue-check">
                                {selectedIssues.includes(type.id) ? '✓' : ''}
                            </div>
                        </button>
                    ))}
                </div>
                {isSoftwareOnly && (
                    <div className="quiz__alert-box">
                        ⚠️ We do not offer on-site appointments for software-only issues. Please visit us in-store.
                    </div>
                )}
            </div>

            {/* Back Glass Color Selection */}
            {selectedIssues.includes('back-glass') && BACK_GLASS_COLORS[selectedDevice.id] && (
                <div className="quiz__section">
                    <h3 className="quiz__section-title">Back Glass Color</h3>
                    <p className="quiz__quality-subtitle">
                        Select the color of your {selectedDevice.name} so we order the correct part.
                    </p>
                    <div className="quiz__color-grid">
                        {BACK_GLASS_COLORS[selectedDevice.id].map((color) => (
                            <button
                                key={color}
                                className={`quiz__color-chip ${backGlassColor === color ? 'quiz__color-chip--selected' : ''}`}
                                onClick={() => onSetBackGlassColor(color)}
                            >
                                {backGlassColor === color && <span className="quiz__color-chip-check">✓</span>}
                                {color}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Quality Tier Selection */}
            {selectedIssues.length > 0 && !isSoftwareOnly && (
                <div className="quiz__section">
                    <h3 className="quiz__section-title">Choose Parts Quality</h3>
                    <p className="quiz__quality-subtitle">Select a quality tier for each repair. This affects pricing and part longevity.</p>
                    <div className="quiz__tier-legend">
                        {PARTS_TIERS.map((tier) => (
                            <div key={tier.id} className="quiz__tier-legend-item">
                                <span className="quiz__tier-legend-dot" style={{ background: tier.color }}></span>
                                <span className="quiz__tier-legend-name">{tier.name}</span>
                                <span className="quiz__tier-legend-desc">— {tier.description}</span>
                            </div>
                        ))}
                    </div>
                    <div className="quiz__per-issue-tiers">
                        {selectedIssues.map((issueId) => {
                            const type = availableRepairTypes.find((t) => t.id === issueId) || REPAIR_TYPES.find((t) => t.id === issueId);
                            const currentTier = issueTiers[issueId];
                            const stockStatus = currentTier ? isPartInStock(issueId, currentTier) : null;
                            const availableTierIds = selectedDevice
                                ? getAvailableTiersForRepair(selectedDevice.name, issueId)
                                : null;
                            const tiersToShow = availableTierIds
                                ? PARTS_TIERS.filter(t => availableTierIds.includes(t.id))
                                : PARTS_TIERS;
                            return (
                                <div key={issueId} className="pit-row">
                                    <div className="pit-row__info">
                                        <span className="pit-row__icon">{type?.icon}</span>
                                        <span className="pit-row__name">{type?.name}</span>
                                        {currentTier && stockStatus !== null && (
                                            <span className={`pit-row__stock ${stockStatus ? 'pit-row__stock--in' : 'pit-row__stock--out'}`}>
                                                {stockStatus ? 'In Stock' : 'Needs Ordering'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="pit-row__tiers" role="group" aria-label={`Parts tier for ${type?.name}`}>
                                        {tiersToShow.map((tier) => {
                                            const price = selectedDevice
                                                ? (getDeviceRepairPrice(selectedDevice.name, issueId, tier.id) ?? SAMPLE_PRICING[issueId]?.[tier.id] ?? 0)
                                                : (SAMPLE_PRICING[issueId]?.[tier.id] || 0);
                                            const tierStock = isPartInStock(issueId, tier.id);
                                            return (
                                                <button
                                                    key={tier.id}
                                                    className={`pit-tier ${currentTier === tier.id ? 'pit-tier--selected' : ''}`}
                                                    onClick={() => onSetTier(issueId, tier.id)}
                                                    style={currentTier === tier.id ? { borderColor: tier.color, background: `${tier.color}10` } : undefined}
                                                >
                                                    <span className="pit-tier__label">{tier.name}</span>
                                                    <span className="pit-tier__price">${price}</span>
                                                    {tierStock !== null && (
                                                        <span className={`pit-tier__stock ${tierStock ? 'pit-tier__stock--in' : 'pit-tier__stock--out'}`}>
                                                            {tierStock ? '✓ In Stock' : '○ Out of Stock'}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}

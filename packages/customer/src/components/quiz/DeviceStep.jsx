import React from 'react';
import { getDevicesByGeneration } from '@shared/constants';

export default function DeviceStep({
    activeGen,
    onGenChange,
    selectedDevice,
    onSelectDevice,
    sortedGens,
    savedDevices = [],
    onSelectSavedDevice,
    onAutoAdvance,
}) {
    return (
        <div className="quiz__section quiz__section--device-picker">
            {/* Saved Devices Quick-Select */}
            {savedDevices.length > 0 && (
                <div className="quiz__saved-devices">
                    <div className="quiz__saved-devices-label">Your saved devices</div>
                    <div className="quiz__saved-devices-list">
                        {savedDevices.map((saved) => (
                            <button
                                key={saved.id}
                                className={`quiz__saved-device-btn ${selectedDevice?.id === saved.device_id ? 'quiz__saved-device-btn--selected' : ''}`}
                                onClick={() => {
                                    if (onSelectSavedDevice) onSelectSavedDevice(saved);
                                    if (onAutoAdvance) onAutoAdvance();
                                }}
                            >
                                <span className="quiz__saved-device-icon">📱</span>
                                <span className="quiz__saved-device-info">
                                    <span className="quiz__saved-device-name">
                                        {saved.nickname || saved.device_name}
                                    </span>
                                    {saved.device_color && (
                                        <span className="quiz__saved-device-color">{saved.device_color}</span>
                                    )}
                                </span>
                                {saved.is_default && <span className="quiz__saved-device-default">Default</span>}
                            </button>
                        ))}
                    </div>
                    <div className="quiz__saved-devices-divider">
                        <span>or select a different device</span>
                    </div>
                </div>
            )}

            <div className="quiz__gen-tabs">
                {sortedGens.map((gen) => (
                    <button
                        key={gen}
                        className={`quiz__gen-tab ${activeGen === gen ? 'quiz__gen-tab--active' : ''}`}
                        onClick={() => onGenChange(gen)}
                    >
                        {gen === 'SE' ? 'SE' : gen}
                    </button>
                ))}
            </div>
            <div className="quiz__devices">
                {getDevicesByGeneration(activeGen).map((device) => (
                    <button
                        key={device.id}
                        className={`quiz__device-card ${selectedDevice?.id === device.id ? 'quiz__device-card--selected' : ''}`}
                        onClick={() => {
                            onSelectDevice(device);
                            if (onAutoAdvance) onAutoAdvance();
                        }}
                    >
                        <div className="quiz__device-icon">📱</div>
                        <div className="quiz__device-name">{device.name}</div>
                        <div className="quiz__device-year">{device.year}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

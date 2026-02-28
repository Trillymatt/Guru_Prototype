import React from 'react';
import { getDevicesByGeneration } from '@shared/constants';

export default function DeviceStep({ activeGen, onGenChange, selectedDevice, onSelectDevice, sortedGens }) {
    return (
        <div className="quiz__section">
            <h3 className="quiz__section-title">Your iPhone</h3>
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
                        onClick={() => onSelectDevice(device)}
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

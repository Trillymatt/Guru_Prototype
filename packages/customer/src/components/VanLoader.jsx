import React from 'react';
import '../styles/van-transition.css';

export default function VanLoader({ text = 'Loading...', compact = false }) {
    return (
        <div className={`van-loader ${compact ? 'van-loader--compact' : ''}`}>
            <p className="van-loader__text">{text}</p>
            <div className="van-loader__van-wrap" aria-hidden="true">
                <div className="van-loader__road" />
                <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="van-loader__van-svg">
                    <rect x="20" y="30" width="140" height="45" rx="6" fill="#1e1f2e" />
                    <path d="M130 30 L160 30 L175 50 L175 75 L130 75 Z" fill="#373848" />
                    <path d="M135 33 L157 33 L170 50 L170 55 L135 55 Z" fill="#a8aab6" opacity="0.6" />
                    <rect x="25" y="35" width="100" height="35" rx="3" fill="#252536" />
                    <text x="55" y="58" fill="#c7c8d0" fontSize="14" fontWeight="800" fontFamily="system-ui">SEER</text>
                    <rect x="20" y="70" width="155" height="8" rx="2" fill="#111827" />
                    <circle cx="55" cy="80" r="12" fill="#374151" />
                    <circle cx="55" cy="80" r="7" fill="#1f2937" />
                    <circle cx="55" cy="80" r="3" fill="#525462" />
                    <circle cx="145" cy="80" r="12" fill="#374151" />
                    <circle cx="145" cy="80" r="7" fill="#1f2937" />
                    <circle cx="145" cy="80" r="3" fill="#525462" />
                    <rect x="170" y="55" width="6" height="10" rx="2" fill="#fbbf24" />
                </svg>
            </div>
        </div>
    );
}

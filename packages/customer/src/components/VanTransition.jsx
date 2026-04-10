import React, { useState, useEffect } from 'react';
import '../styles/van-transition.css';

export default function VanTransition({ active, onComplete }) {
    const [phase, setPhase] = useState('idle'); // 'idle' | 'van-enter' | 'van-center' | 'done'

    useEffect(() => {
        if (!active) {
            setPhase('idle');
            return;
        }
        setPhase('van-enter');

        // Van enters and pauses at center (0.8s)
        const centerTimer = setTimeout(() => setPhase('van-center'), 800);
        // Navigate (2.2s)
        const doneTimer = setTimeout(() => {
            setPhase('done');
            onComplete();
        }, 2200);

        return () => {
            clearTimeout(centerTimer);
            clearTimeout(doneTimer);
        };
    }, [active]);

    if (!active && phase === 'idle') return null;

    return (
        <div className="van-transition">
            <div className="van-transition__van-stage">
                <div className="van-transition__overlay-copy">
                    <div className="van-transition__logo">SEER</div>
                    <div className="van-transition__tagline">Wherever you are</div>
                </div>
                <div className="van-transition__road">
                    <div className="van-transition__road-line" />
                </div>
                <div className={`van-transition__van ${phase === 'van-center' ? 'van-transition__van--center' : ''}`}>
                    <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="van-transition__van-svg">
                        {/* Van body */}
                        <rect x="20" y="30" width="140" height="45" rx="6" fill="#1e1f2e" />
                        {/* Cabin */}
                        <path d="M130 30 L160 30 L175 50 L175 75 L130 75 Z" fill="#373848" />
                        {/* Windshield */}
                        <path d="M135 33 L157 33 L170 50 L170 55 L135 55 Z" fill="#a8aab6" opacity="0.6" />
                        {/* Cargo area */}
                        <rect x="25" y="35" width="100" height="35" rx="3" fill="#252536" />
                        {/* SEER logo on side */}
                        <text x="55" y="58" fill="#c7c8d0" fontSize="14" fontWeight="800" fontFamily="system-ui">SEER</text>
                        {/* Bottom panel */}
                        <rect x="20" y="70" width="155" height="8" rx="2" fill="#111827" />
                        {/* Wheels */}
                        <circle cx="55" cy="80" r="12" fill="#374151" />
                        <circle cx="55" cy="80" r="7" fill="#1f2937" />
                        <circle cx="55" cy="80" r="3" fill="#525462" />
                        <circle cx="145" cy="80" r="12" fill="#374151" />
                        <circle cx="145" cy="80" r="7" fill="#1f2937" />
                        <circle cx="145" cy="80" r="3" fill="#525462" />
                        {/* Headlight */}
                        <rect x="170" y="55" width="6" height="10" rx="2" fill="#fbbf24" />
                        {/* Taillight */}
                        <rect x="20" y="55" width="4" height="8" rx="1" fill="#ef4444" />
                        {/* Tools icon on side */}
                        <circle cx="85" cy="52" r="4" fill="none" stroke="#a8aab6" strokeWidth="1.5" opacity="0.4" />
                    </svg>
                    {/* Exhaust puffs */}
                    <div className="van-transition__exhaust">
                        <div className="van-transition__puff van-transition__puff--1" />
                        <div className="van-transition__puff van-transition__puff--2" />
                        <div className="van-transition__puff van-transition__puff--3" />
                    </div>
                </div>
            </div>
        </div>
    );
}

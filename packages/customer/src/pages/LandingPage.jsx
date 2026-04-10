import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@shared/analytics';
import Navbar from '../components/Navbar';
import VanTransition from '../components/VanTransition';
import SiteFooter from '../components/SiteFooter';

export default function LandingPage() {
    const navigate = useNavigate();
    const [showVanTransition, setShowVanTransition] = useState(false);

    const handleStartRepair = (analyticsLabel) => {
        if (analyticsLabel) analytics.buttonClick(analyticsLabel);
        setShowVanTransition(true);
    };

    return (
        <>
            <VanTransition active={showVanTransition} onComplete={() => navigate('/repair')} />
            <Navbar />

            <section className="hero hero--single-screen">
                <div className="hero__bg">
                    <div className="hero__bg-orb hero__bg-orb--1"></div>
                    <div className="hero__bg-orb hero__bg-orb--2"></div>
                    <div className="hero__bg-orb hero__bg-orb--3"></div>
                </div>
                <div className="guru-container hero__content">
                    <div className="hero__text hero__text--panel">
                        <div className="hero__badge">
                            <span className="hero__badge-dot"></span>
                            Now serving Dallas–Fort Worth
                        </div>
                        <h1 className="hero__title">
                            iPhone repair,{' '}
                            <span className="hero__title-highlight">delivered to you.</span>
                        </h1>
                        <p className="hero__subtitle-compact">
                            Premium repairs by certified technicians, scheduled at your location with honest, transparent pricing.
                        </p>
                        <div className="hero__trust-row" aria-label="SEER service highlights">
                            <span className="hero__trust-chip">Certified Technicians</span>
                            <span className="hero__trust-chip">We Come to You</span>
                            <span className="hero__trust-chip">Transparent Pricing</span>
                        </div>
                        <div className="hero__actions">
                            <button className="guru-btn guru-btn--primary guru-btn--lg" onClick={() => handleStartRepair('hero_start_repair')}>
                                Start a Repair →
                            </button>
                        </div>
                    </div>
                    <div className="hero__visual">
                        <div className="hero__van-mockup" onClick={() => handleStartRepair('hero_van_start_repair')}>
                            <svg viewBox="0 0 420 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero__van-svg">
                                {/* Road */}
                                <rect x="0" y="170" width="420" height="30" rx="4" fill="#1a1a2e" />
                                <line x1="20" y1="185" x2="60" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="80" y1="185" x2="120" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="140" y1="185" x2="180" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="200" y1="185" x2="240" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="260" y1="185" x2="300" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="320" y1="185" x2="360" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                <line x1="380" y1="185" x2="410" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                                {/* Van body */}
                                <rect x="60" y="70" width="260" height="85" rx="10" fill="#1e1f2e" />
                                {/* Cabin */}
                                <path d="M270 70 L340 70 L365 100 L365 155 L270 155 Z" fill="#373848" />
                                {/* Windshield */}
                                <path d="M278 75 L335 75 L358 100 L358 115 L278 115 Z" fill="#a8aab6" opacity="0.5" />
                                {/* Windshield glare */}
                                <path d="M290 75 L310 75 L333 100 L313 100 Z" fill="#ffffff" opacity="0.12" />
                                {/* Cargo area */}
                                <rect x="70" y="80" width="190" height="65" rx="5" fill="#252536" />
                                {/* SEER logo on side */}
                                <text x="120" y="120" fill="#c7c8d0" fontSize="26" fontWeight="800" fontFamily="system-ui" letterSpacing="2">SEER</text>
                                {/* Tagline */}
                                <text x="165" y="132" fill="#a8aab6" fontSize="8" fontFamily="system-ui" opacity="0.7" textAnchor="middle">WHEREVER YOU ARE</text>
                                {/* Bottom panel */}
                                <rect x="60" y="151" width="305" height="14" rx="3" fill="#111827" />
                                {/* Front wheel */}
                                <circle cx="320" cy="165" r="22" fill="#374151" />
                                <circle cx="320" cy="165" r="14" fill="#1f2937" />
                                <circle cx="320" cy="165" r="5" fill="#525462" />
                                {/* Rear wheel */}
                                <circle cx="120" cy="165" r="22" fill="#374151" />
                                <circle cx="120" cy="165" r="14" fill="#1f2937" />
                                <circle cx="120" cy="165" r="5" fill="#525462" />
                                {/* Headlight */}
                                <rect x="358" y="108" width="10" height="18" rx="3" fill="#fbbf24" />
                                {/* Headlight glow */}
                                <ellipse cx="375" cy="117" rx="15" ry="10" fill="#fbbf24" opacity="0.08" />
                                {/* Taillight */}
                                <rect x="58" y="110" width="6" height="14" rx="2" fill="#ef4444" />
                                {/* Roof rack */}
                                <rect x="80" y="63" width="170" height="4" rx="2" fill="#373848" />
                                <rect x="100" y="59" width="4" height="8" rx="1" fill="#373848" />
                                <rect x="230" y="59" width="4" height="8" rx="1" fill="#373848" />
                                {/* Toolbox on roof */}
                                <rect x="140" y="50" width="55" height="14" rx="3" fill="#252536" />
                                <rect x="155" y="47" width="25" height="6" rx="2" fill="#373848" />
                                {/* Side mirror */}
                                <rect x="356" y="88" width="12" height="8" rx="2" fill="#373848" />
                                {/* Purple accent stripe */}
                                <rect x="70" y="148" width="190" height="3" rx="1" fill="#7C3AED" opacity="0.6" />
                            </svg>
                            <div className="hero__van-cta">
                                On-demand is coming soon
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <SiteFooter />
        </>
    );
}

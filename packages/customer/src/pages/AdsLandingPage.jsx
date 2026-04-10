import React from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@shared/analytics';
import SiteFooter from '../components/SiteFooter';

export default function AdsLandingPage() {
    const navigate = useNavigate();

    const handleEnterSite = () => {
        analytics.buttonClick('ads_landing_enter_home');
        navigate('/');
    };

    return (
        <>
            <main className="ads-landing" aria-label="Ad landing page">
                <div className="ads-landing__bg" />
                <div className="ads-landing__glow ads-landing__glow--one" />
                <div className="ads-landing__glow ads-landing__glow--two" />

                <section className="ads-landing__panel">
                    <div className="ads-landing__badge">SEER Experience</div>
                    <div className="ads-landing__van-wrap" aria-hidden="true">
                        <svg viewBox="0 0 420 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="ads-landing__van-svg">
                            <rect x="0" y="170" width="420" height="30" rx="4" fill="#1a1a2e" />
                            <line x1="20" y1="185" x2="60" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="80" y1="185" x2="120" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="140" y1="185" x2="180" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="200" y1="185" x2="240" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="260" y1="185" x2="300" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="320" y1="185" x2="360" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <line x1="380" y1="185" x2="410" y2="185" stroke="#525462" strokeWidth="2" strokeDasharray="8 6" />
                            <rect x="60" y="70" width="260" height="85" rx="10" fill="#1e1f2e" />
                            <path d="M270 70 L340 70 L365 100 L365 155 L270 155 Z" fill="#373848" />
                            <path d="M278 75 L335 75 L358 100 L358 115 L278 115 Z" fill="#a8aab6" opacity="0.5" />
                            <path d="M290 75 L310 75 L333 100 L313 100 Z" fill="#ffffff" opacity="0.12" />
                            <rect x="70" y="80" width="190" height="65" rx="5" fill="#252536" />
                            <text x="120" y="120" fill="#c7c8d0" fontSize="26" fontWeight="800" fontFamily="system-ui" letterSpacing="2">SEER</text>
                            <text x="165" y="132" fill="#a8aab6" fontSize="8" fontFamily="system-ui" opacity="0.7" textAnchor="middle">WHEREVER YOU ARE</text>
                            <rect x="60" y="151" width="305" height="14" rx="3" fill="#111827" />
                            <circle cx="320" cy="165" r="22" fill="#374151" />
                            <circle cx="320" cy="165" r="14" fill="#1f2937" />
                            <circle cx="320" cy="165" r="5" fill="#525462" />
                            <circle cx="120" cy="165" r="22" fill="#374151" />
                            <circle cx="120" cy="165" r="14" fill="#1f2937" />
                            <circle cx="120" cy="165" r="5" fill="#525462" />
                            <rect x="358" y="108" width="10" height="18" rx="3" fill="#fbbf24" />
                            <ellipse cx="375" cy="117" rx="15" ry="10" fill="#fbbf24" opacity="0.08" />
                            <rect x="58" y="110" width="6" height="14" rx="2" fill="#ef4444" />
                            <rect x="80" y="63" width="170" height="4" rx="2" fill="#373848" />
                            <rect x="100" y="59" width="4" height="8" rx="1" fill="#373848" />
                            <rect x="230" y="59" width="4" height="8" rx="1" fill="#373848" />
                            <rect x="140" y="50" width="55" height="14" rx="3" fill="#252536" />
                            <rect x="155" y="47" width="25" height="6" rx="2" fill="#373848" />
                            <rect x="356" y="88" width="12" height="8" rx="2" fill="#373848" />
                            <rect x="70" y="148" width="190" height="3" rx="1" fill="#7C3AED" opacity="0.6" />
                        </svg>
                    </div>
                    <h1 className="ads-landing__title">A better repair experience starts here.</h1>
                    <p className="ads-landing__subtitle">
                        New to SEER? We repair iPhones at your location with certified technicians,
                        clear pricing, and a process that is simple from start to finish.
                    </p>

                    <div className="ads-landing__experience">
                        <div className="ads-landing__experience-item">
                            <span className="ads-landing__experience-label">What is SEER?</span>
                            <p>A mobile iPhone repair service built by Apple Certified professionals.</p>
                        </div>
                        <div className="ads-landing__experience-item">
                            <span className="ads-landing__experience-label">How it works</span>
                            <p>Book a time, we come to you, and complete most repairs on-site.</p>
                        </div>
                        <div className="ads-landing__experience-item">
                            <span className="ads-landing__experience-label">Why people choose us</span>
                            <p>Trusted expertise, transparent pricing, and no store wait.</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="guru-btn guru-btn--primary guru-btn--lg ads-landing__cta"
                        onClick={handleEnterSite}
                    >
                        Explore SEER
                    </button>
                </section>
            </main>
            <SiteFooter />
        </>
    );
}

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { analytics } from '@shared/analytics';
import Navbar from '../components/Navbar';
import VanTransition from '../components/VanTransition';

/* ─── Intersection Observer hook for scroll-reveal ──── */
function useReveal() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('revealed');
                    io.unobserve(el);
                }
            },
            { threshold: 0.15 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
}

function Reveal({ children, className = '', delay = 0 }) {
    const ref = useReveal();
    return (
        <div
            ref={ref}
            className={`reveal ${className}`}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
}

/* ─── Phone Screen Illustrations for each step ──── */
function PhoneScreenSelect({ active }) {
    return (
        <div className={`hiw-phone-scene ${active ? 'hiw-phone-scene--active' : ''}`}>
            <div className="hiw-scene-label">Select Your Device</div>
            <div className="hiw-scene-devices">
                <div className="hiw-scene-device hiw-scene-device--selected">
                    <div className="hiw-scene-device-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                    </div>
                    <span>iPhone 16 Pro</span>
                    <div className="hiw-scene-check">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                </div>
                <div className="hiw-scene-device">
                    <div className="hiw-scene-device-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                    </div>
                    <span>iPhone 15</span>
                </div>
            </div>
            <div className="hiw-scene-issues">
                <div className="hiw-scene-issue hiw-scene-issue--selected">Cracked Screen</div>
                <div className="hiw-scene-issue hiw-scene-issue--selected">Battery</div>
                <div className="hiw-scene-issue">Charging Port</div>
            </div>
        </div>
    );
}

function PhoneScreenParts({ active }) {
    return (
        <div className={`hiw-phone-scene ${active ? 'hiw-phone-scene--active' : ''}`}>
            <div className="hiw-scene-label">Choose Quality</div>
            <div className="hiw-scene-parts">
                <div className="hiw-scene-part">
                    <div className="hiw-scene-part-tier hiw-scene-part-tier--eco">$</div>
                    <span>Economy</span>
                    <span className="hiw-scene-part-price">$49</span>
                </div>
                <div className="hiw-scene-part hiw-scene-part--selected">
                    <div className="hiw-scene-part-tier hiw-scene-part-tier--prem">$$</div>
                    <span>Premium</span>
                    <span className="hiw-scene-part-price">$89</span>
                    <div className="hiw-scene-recommended">Recommended</div>
                </div>
                <div className="hiw-scene-part">
                    <div className="hiw-scene-part-tier hiw-scene-part-tier--gen">$$$</div>
                    <span>Genuine</span>
                    <span className="hiw-scene-part-price">$149</span>
                </div>
            </div>
        </div>
    );
}

function PhoneScreenSchedule({ active }) {
    return (
        <div className={`hiw-phone-scene ${active ? 'hiw-phone-scene--active' : ''}`}>
            <div className="hiw-scene-label">Pick a Time</div>
            <div className="hiw-scene-calendar">
                <div className="hiw-scene-cal-header">February 2026</div>
                <div className="hiw-scene-cal-days">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="hiw-scene-cal-grid">
                    {[...Array(28)].map((_, i) => (
                        <span key={i} className={`hiw-scene-cal-day${i + 1 === 20 ? ' hiw-scene-cal-day--selected' : ''}${i + 1 < 17 ? ' hiw-scene-cal-day--past' : ''}`}>
                            {i + 1}
                        </span>
                    ))}
                </div>
            </div>
            <div className="hiw-scene-location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>1234 Oak Lawn Ave, Dallas</span>
            </div>
        </div>
    );
}

function PhoneScreenRepair({ active }) {
    return (
        <div className={`hiw-phone-scene ${active ? 'hiw-phone-scene--active' : ''}`}>
            <div className="hiw-scene-label">Repair in Progress</div>
            <div className="hiw-scene-status">
                <div className="hiw-scene-status-ring">
                    <svg viewBox="0 0 100 100" className="hiw-scene-ring-svg">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6"/>
                        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="264" strokeDashoffset="66" className="hiw-scene-ring-progress"/>
                        <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a8aab6"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
                    </svg>
                    <div className="hiw-scene-status-pct">75%</div>
                </div>
                <div className="hiw-scene-status-text">Almost done!</div>
            </div>
            <div className="hiw-scene-checklist">
                <div className="hiw-scene-check-item hiw-scene-check-item--done">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Screen replaced
                </div>
                <div className="hiw-scene-check-item hiw-scene-check-item--done">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Battery installed
                </div>
                <div className="hiw-scene-check-item hiw-scene-check-item--active">
                    <div className="hiw-scene-spinner"></div>
                    Testing device...
                </div>
            </div>
        </div>
    );
}

/* ─── Animated How It Works Section ──── */
const STEPS = [
    {
        num: '01',
        title: "Tell us what's broken",
        desc: 'Pick your iPhone model and select the issues — cracked screen, bad battery, or anything else.',
        Screen: PhoneScreenSelect,
    },
    {
        num: '02',
        title: 'Choose your parts',
        desc: 'Economy, Premium, or Genuine Apple — you pick the quality and price for each repair.',
        Screen: PhoneScreenParts,
    },
    {
        num: '03',
        title: 'Pick a time & place',
        desc: 'Schedule a slot at least 3 days out. We come to your home, office, or anywhere you need.',
        Screen: PhoneScreenSchedule,
    },
    {
        num: '04',
        title: 'We fix it on the spot',
        desc: 'Your technician arrives, repairs your device, and you sign off — all in under an hour.',
        Screen: PhoneScreenRepair,
    },
];

function HowItWorks() {
    const sectionRef = useRef(null);
    const [activeStep, setActiveStep] = useState(0);
    const [sectionVisible, setSectionVisible] = useState(false);
    const stepRefs = useRef([]);

    // Observe when section enters viewport
    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setSectionVisible(true);
                    io.unobserve(el);
                }
            },
            { threshold: 0.1 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Track which step is most visible
    useEffect(() => {
        const observers = [];
        stepRefs.current.forEach((el, i) => {
            if (!el) return;
            const io = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveStep(i);
                    }
                },
                { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
            );
            io.observe(el);
            observers.push(io);
        });
        return () => observers.forEach(io => io.disconnect());
    }, []);

    return (
        <section
            className={`hiw-section ${sectionVisible ? 'hiw-section--visible' : ''}`}
            id="how-it-works"
            ref={sectionRef}
        >
            <div className="guru-container">
                <div className="hiw-header">
                    <span className="section-label">4 Simple Steps</span>
                    <h2 className="section-title">How SEER works</h2>
                </div>

                <div className="hiw-layout">
                    {/* Phone mockup — sticky on desktop */}
                    <div className="hiw-phone-col">
                        <div className="hiw-phone-sticky">
                            <div className="hiw-phone">
                                <div className="hiw-phone-inner">
                                    <div className="hiw-phone-notch"></div>
                                    <div className="hiw-phone-screens">
                                        {STEPS.map((step, i) => (
                                            <step.Screen key={i} active={activeStep === i} />
                                        ))}
                                    </div>
                                    <div className="hiw-phone-home"></div>
                                </div>
                            </div>
                            {/* Step indicator dots */}
                            <div className="hiw-phone-dots">
                                {STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`hiw-phone-dot ${activeStep === i ? 'hiw-phone-dot--active' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Steps column */}
                    <div className="hiw-steps-col">
                        {STEPS.map((step, i) => (
                            <div
                                key={step.num}
                                ref={el => stepRefs.current[i] = el}
                                className={`hiw-step ${activeStep === i ? 'hiw-step--active' : ''} ${activeStep > i ? 'hiw-step--done' : ''}`}
                            >
                                <div className="hiw-step-indicator">
                                    <div className="hiw-step-num">{step.num}</div>
                                    {i < STEPS.length - 1 && <div className="hiw-step-line">
                                        <div className="hiw-step-line-fill" style={{ transform: activeStep > i ? 'scaleY(1)' : 'scaleY(0)' }}></div>
                                    </div>}
                                </div>
                                <div className="hiw-step-content">
                                    <h3 className="hiw-step-title">{step.title}</h3>
                                    <p className="hiw-step-desc">{step.desc}</p>
                                    {/* Mobile-only: show phone screen inline */}
                                    <div className="hiw-step-phone-mobile">
                                        <div className="hiw-phone hiw-phone--mini">
                                            <div className="hiw-phone-inner">
                                                <div className="hiw-phone-notch"></div>
                                                <div className="hiw-phone-screens">
                                                    <step.Screen active={true} />
                                                </div>
                                                <div className="hiw-phone-home"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="hiw-cta" style={{ textAlign: 'center', marginTop: 48 }}>
                    <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg" onClick={() => analytics.buttonClick('hiw_start_repair')}>
                        Start Your Repair →
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function LandingPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [showVanTransition, setShowVanTransition] = useState(false);

    const handleStartRepair = (analyticsLabel) => {
        if (analyticsLabel) analytics.buttonClick(analyticsLabel);
        setShowVanTransition(true);
    };

    useEffect(() => {
        const sectionId = location.state?.scrollTo;
        if (sectionId) {
            requestAnimationFrame(() => {
                const el = document.getElementById(sectionId);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            });
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    return (
        <>
            <VanTransition active={showVanTransition} onComplete={() => navigate('/repair')} />
            <Navbar />

            {/* ─── Hero ─────────────────────────────────────────── */}
            <section className="hero">
                <div className="hero__bg">
                    <div className="hero__bg-orb hero__bg-orb--1"></div>
                    <div className="hero__bg-orb hero__bg-orb--2"></div>
                    <div className="hero__bg-orb hero__bg-orb--3"></div>
                </div>
                <div className="guru-container hero__content">
                    <div className="hero__text">
                        <div className="hero__badge">
                            <span className="hero__badge-dot"></span>
                            Now serving Dallas–Fort Worth
                        </div>
                        <div className="hero__trust-strip">
                            <div className="hero__trust-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Apple Certified Technicians
                            </div>
                            <div className="hero__trust-sep" aria-hidden="true">·</div>
                            <div className="hero__trust-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Former Apple Employees
                            </div>
                            <div className="hero__trust-sep" aria-hidden="true">·</div>
                            <div className="hero__trust-item">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Mobile — We Come to You
                            </div>
                        </div>
                        <h1 className="hero__title">
                            iPhone repair,{' '}
                            <span className="hero__title-highlight">delivered to you.</span>
                        </h1>
                        <p className="hero__subtitle">
                            Expert technicians at your door. Pick your parts quality,
                            choose a time, and we handle the rest — fast, transparent, guaranteed.
                        </p>
                        <div className="hero__actions">
                            <button className="guru-btn guru-btn--primary guru-btn--lg" onClick={() => handleStartRepair('hero_start_repair')}>
                                Start a Repair →
                            </button>
                            <a href="#how-it-works" className="guru-btn guru-btn--secondary guru-btn--lg" onClick={() => analytics.buttonClick('hero_how_it_works')}>
                                See How It Works
                            </a>
                        </div>
                        <div className="hero__stats">
                            <div className="hero__stat">
                                <div className="hero__stat-value">3</div>
                                <div className="hero__stat-label">Quality Tiers</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-value">48hr</div>
                                <div className="hero__stat-label">Avg. Turnaround</div>
                            </div>
                            <div className="hero__stat">
                                <div className="hero__stat-value">100%</div>
                                <div className="hero__stat-label">Satisfaction</div>
                            </div>
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
                                <text x="100" y="138" fill="#a8aab6" fontSize="8" fontFamily="system-ui" opacity="0.7">MOBILE REPAIR — COMING TO YOU</text>
                                {/* Bottom panel */}
                                <rect x="60" y="148" width="305" height="14" rx="3" fill="#111827" />
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
                                <rect x="70" y="145" width="190" height="3" rx="1" fill="#7C3AED" opacity="0.6" />
                            </svg>
                            <div className="hero__van-cta">
                                Start a Repair
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── How It Works — Animated ─────────────────────── */}
            <HowItWorks />

            {/* ─── Features — Bento Grid ───────────────────────── */}
            <section className="bento-section" id="features">
                <div className="guru-container">
                    <Reveal>
                        <div className="section-header">
                            <span className="section-label">The SEER Difference</span>
                            <h2 className="section-title">Why customers love us</h2>
                        </div>
                    </Reveal>
                    <div className="bento-grid">
                        <Reveal className="bento-card bento-card--large bento-card--purple" delay={0}>
                            <div className="bento-card__icon-lg">🏠</div>
                            <h3 className="bento-card__title">We come to you</h3>
                            <p className="bento-card__desc">
                                No store visits. No waiting. Your technician meets you wherever you are — home, office, or coffee shop.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card" delay={100}>
                            <div className="bento-card__icon">🔍</div>
                            <h3 className="bento-card__title">Upfront pricing</h3>
                            <p className="bento-card__desc">
                                See exact costs before you book. No hidden fees, ever.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card" delay={200}>
                            <div className="bento-card__icon">📍</div>
                            <h3 className="bento-card__title">Live tracking</h3>
                            <p className="bento-card__desc">
                                Watch your tech arrive in real-time, just like a rideshare.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card bento-card--wide bento-card--dark" delay={150}>
                            <div className="bento-card__row">
                                <div>
                                    <h3 className="bento-card__title">3-tier parts model</h3>
                                    <p className="bento-card__desc">
                                        Choose Economy, Premium, or Genuine Apple parts for each repair — mix and match to fit your budget and standards.
                                    </p>
                                </div>
                                <div className="bento-card__tiers">
                                    <span className="bento-tier bento-tier--eco">$</span>
                                    <span className="bento-tier bento-tier--prem">$$</span>
                                    <span className="bento-tier bento-tier--gen">$$$</span>
                                </div>
                            </div>
                        </Reveal>
                        <Reveal className="bento-card" delay={250}>
                            <div className="bento-card__icon">💬</div>
                            <h3 className="bento-card__title">In-app chat</h3>
                            <p className="bento-card__desc">
                                Message your tech directly for updates during the repair.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card" delay={300}>
                            <div className="bento-card__icon">⏱️</div>
                            <h3 className="bento-card__title">Done in under an hour</h3>
                            <p className="bento-card__desc">
                                Most repairs completed on-site while you wait. No drop-offs needed.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card bento-card--coming-soon" delay={350}>
                            <div className="bento-card__coming-soon-badge">Coming Soon</div>
                            <div className="bento-card__icon">⚡</div>
                            <h3 className="bento-card__title">On-demand repairs</h3>
                            <p className="bento-card__desc">
                                Need it fixed now? Request a same-day technician for urgent repairs — no appointment needed.
                            </p>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ─── Trust & Team ─────────────────────────────────── */}
            <section className="trust-section">
                <div className="guru-container">
                    <Reveal>
                        <div className="section-header">
                            <span className="section-label">Who We Are</span>
                            <h2 className="section-title">Built on expertise & integrity</h2>
                            <p className="section-desc">
                                SEER was founded by former Apple professionals who believe great repair
                                work starts with honesty, transparency, and treating every customer right.
                            </p>
                        </div>
                    </Reveal>

                    <div className="trust-grid">
                        <Reveal className="trust-card trust-card--apple" delay={0}>
                            <div className="trust-card__icon-wrap">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                            </div>
                            <h3 className="trust-card__title">Apple Certified Technicians</h3>
                            <p className="trust-card__desc">
                                Every SEER technician holds Apple certification — the same credentials
                                recognized at Apple Stores and Authorized Service Providers. You get
                                Genius Bar expertise at your door.
                            </p>
                            <div className="trust-card__badge">Apple Certified</div>
                        </Reveal>

                        <Reveal className="trust-card trust-card--experience" delay={100}>
                            <div className="trust-card__icon-wrap">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                </svg>
                            </div>
                            <h3 className="trust-card__title">Former Apple Employees</h3>
                            <p className="trust-card__desc">
                                Our team comes directly from Apple — including Genius Bar technicians
                                and Apple Store specialists. This isn't just training. It's firsthand,
                                professional experience from inside Apple.
                            </p>
                            <div className="trust-card__badge">Apple Alumni</div>
                        </Reveal>

                        <Reveal className="trust-card trust-card--mobile" delay={200}>
                            <div className="trust-card__icon-wrap">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                                </svg>
                            </div>
                            <h3 className="trust-card__title">Mobile — We Come to You</h3>
                            <p className="trust-card__desc">
                                No store visits, no waiting in line. Our technicians come directly to
                                your home, office, or wherever you need — and fix your device on the spot
                                while you watch.
                            </p>
                            <div className="trust-card__badge">On-Site Repair</div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* ─── CTA ──────────────────────────────────────────── */}
            <section className="cta">
                <div className="guru-container">
                    <Reveal>
                        <div className="cta__card">
                            <h2 className="cta__title">Ready to get started?</h2>
                            <p className="cta__subtitle">
                                Your phone deserves the best. Start your repair in under 2 minutes.
                            </p>
                            <button className="cta__button" onClick={() => handleStartRepair('cta_start_repair')}>
                                Start Your Repair →
                            </button>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ─── Footer ───────────────────────────────────────── */}
            <footer className="footer">
                <div className="guru-container">
                    <div className="footer__grid">
                        <div>
                            <div className="footer__brand-name">SEER</div>
                            <p className="footer__brand-desc">
                                Premium mobile repair delivered to your door.
                                Fast, transparent, and guaranteed.
                            </p>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Company</h4>
                            <ul className="footer__links">
                                <li><a href="#features">About Us</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Support</h4>
                            <ul className="footer__links">
                                <li><Link to="/faq">FAQ</Link></li>
                                <li><a href="mailto:support@seerrepair.com">Contact</a></li>
                                <li><Link to="/legal?section=warranty">Warranty</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Legal</h4>
                            <ul className="footer__links">
                                <li><Link to="/legal">Terms of Service</Link></li>
                                <li><Link to="/legal?section=privacy">Privacy Policy</Link></li>
                                <li><Link to="/legal?section=repair">Repair Agreement</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer__bottom">
                        <span>© 2026 SEER Mobile Repair Solutions. All rights reserved.</span>
                        <span>Built with purpose and care.</span>
                    </div>
                </div>
            </footer>
        </>
    );
}

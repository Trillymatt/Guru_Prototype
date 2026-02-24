import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

/* ─── Daily Bible Verse ─────────────────────────────────────── */
const VERSES = [
    { ref: 'Proverbs 3:5–6', text: 'Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.' },
    { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
    { ref: 'Jeremiah 29:11', text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."' },
    { ref: 'Matthew 5:16', text: 'In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven.' },
    { ref: 'Colossians 3:23', text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.' },
    { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you.' },
    { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
    { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
    { ref: '1 Corinthians 10:31', text: 'So whether you eat or drink or whatever you do, do it all for the glory of God.' },
    { ref: 'Galatians 5:13', text: 'You, my brothers and sisters, were called to be free. But do not use your freedom to indulge the flesh; rather, serve one another humbly in love.' },
    { ref: 'Micah 6:8', text: 'He has shown you, O mortal, what is good. And what does the Lord require of you? To act justly and to love mercy and to walk humbly with your God.' },
    { ref: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
];

function getDailyVerse() {
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = new Date() - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    return VERSES[dayOfYear % VERSES.length];
}

function BibleVerse() {
    const verse = getDailyVerse();
    return (
        <div className="bible-verse">
            <div className="bible-verse__inner">
                <div className="bible-verse__cross" aria-hidden="true">✝</div>
                <p className="bible-verse__text">"{verse.text}"</p>
                <span className="bible-verse__ref">— {verse.ref}</span>
            </div>
        </div>
    );
}

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
                        <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#22c55e"/></linearGradient></defs>
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
                    <h2 className="section-title">How Guru works</h2>
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
                    <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg">
                        Start Your Repair →
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function LandingPage() {
    return (
        <>
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
                                <span className="hero__trust-cross">✝</span>
                                Faith-Based Company
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
                            <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg">
                                Start a Repair →
                            </Link>
                            <a href="#how-it-works" className="guru-btn guru-btn--secondary guru-btn--lg">
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
                        <div className="hero__phone-mockup">
                            <Link to="/repair" className="hero__phone-screen">
                                <div className="hero__phone-notch"></div>
                                <div className="hero__phone-logo">Guru</div>
                                <div className="hero__phone-tagline">
                                    Better than when you gave it to us.
                                </div>
                                <div className="hero__phone-cta">
                                    Start Repair
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                </div>
                            </Link>
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
                            <span className="section-label">The Guru Difference</span>
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
                            <h2 className="section-title">Built on expertise & faith</h2>
                            <p className="section-desc">
                                Guru was founded by former Apple professionals who believe great repair
                                work starts with integrity — and that integrity starts with faith.
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
                                Every Guru technician holds Apple certification — the same credentials
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

                        <Reveal className="trust-card trust-card--faith" delay={200}>
                            <div className="trust-card__icon-wrap trust-card__icon-wrap--faith">
                                <span className="trust-card__cross-icon">✝</span>
                            </div>
                            <h3 className="trust-card__title">A Faith-Based Company</h3>
                            <p className="trust-card__desc">
                                Guru was founded on Christian values — honesty, servant leadership,
                                and a commitment to treating every customer the way we'd want to be
                                treated. Our faith drives the way we work.
                            </p>
                            <div className="trust-card__badge trust-card__badge--faith">Integrity First</div>
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
                            <Link to="/repair" className="cta__button">
                                Start Your Repair →
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ─── Daily Bible Verse ────────────────────────────── */}
            <BibleVerse />

            {/* ─── Footer ───────────────────────────────────────── */}
            <footer className="footer">
                <div className="guru-container">
                    <div className="footer__grid">
                        <div>
                            <div className="footer__brand-name">Guru</div>
                            <p className="footer__brand-desc">
                                Premium mobile repair delivered to your door.
                                Fast, transparent, and guaranteed.
                            </p>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Company</h4>
                            <ul className="footer__links">
                                <li><a href="#features">About Us</a></li>
                                <li><a href="http://localhost:5174" target="_blank" rel="noopener noreferrer">Technician Portal →</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Support</h4>
                            <ul className="footer__links">
                                <li><Link to="/faq">FAQ</Link></li>
                                <li><a href="mailto:support@gururepair.com">Contact</a></li>
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
                        <span>© 2026 Guru Mobile Repair Solutions. All rights reserved.</span>
                        <span>Built with faith, purpose, and care.</span>
                    </div>
                </div>
            </footer>
        </>
    );
}

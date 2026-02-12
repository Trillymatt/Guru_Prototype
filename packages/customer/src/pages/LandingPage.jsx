import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

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

            {/* ─── How It Works — Timeline ─────────────────────── */}
            <section className="timeline-section" id="how-it-works">
                <div className="guru-container">
                    <Reveal>
                        <div className="section-header">
                            <span className="section-label">4 Simple Steps</span>
                            <h2 className="section-title">How Guru works</h2>
                        </div>
                    </Reveal>
                    <div className="timeline">
                        {[
                            {
                                num: '01',
                                title: 'Tell us what\'s broken',
                                desc: 'Pick your iPhone model and select the issues — cracked screen, bad battery, or anything else.',
                                icon: '📱',
                            },
                            {
                                num: '02',
                                title: 'Choose your parts',
                                desc: 'Economy, Premium, or Genuine Apple — you pick the quality and price for each repair.',
                                icon: '⚡',
                            },
                            {
                                num: '03',
                                title: 'Pick a time & place',
                                desc: 'Schedule a slot at least 3 days out. We come to your home, office, or anywhere you need.',
                                icon: '📍',
                            },
                            {
                                num: '04',
                                title: 'We fix it on the spot',
                                desc: 'Your technician arrives, repairs your device, and you sign off — all in under an hour.',
                                icon: '✨',
                            },
                        ].map((step, i) => (
                            <Reveal key={step.num} delay={i * 120}>
                                <div className="timeline__item">
                                    <div className="timeline__number">{step.num}</div>
                                    <div className="timeline__connector"></div>
                                    <div className="timeline__content">
                                        <span className="timeline__icon">{step.icon}</span>
                                        <h3 className="timeline__title">{step.title}</h3>
                                        <p className="timeline__desc">{step.desc}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                    <Reveal delay={500}>
                        <div style={{ textAlign: 'center', marginTop: 48 }}>
                            <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg">
                                Start Your Repair →
                            </Link>
                        </div>
                    </Reveal>
                </div>
            </section>

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
                        <Reveal className="bento-card" delay={150}>
                            <div className="bento-card__icon">💬</div>
                            <h3 className="bento-card__title">In-app chat</h3>
                            <p className="bento-card__desc">
                                Message your tech directly for updates during the repair.
                            </p>
                        </Reveal>
                        <Reveal className="bento-card bento-card--wide bento-card--dark" delay={250}>
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
                                <li><a href="#">About Us</a></li>
                                <li><a href="#">Careers</a></li>
                                <li><a href="#">Blog</a></li>
                                <li><a href="http://localhost:5174" target="_blank" rel="noopener noreferrer">Technician Portal →</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Support</h4>
                            <ul className="footer__links">
                                <li><a href="#">FAQ</a></li>
                                <li><a href="#">Contact</a></li>
                                <li><a href="#">Warranty</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Legal</h4>
                            <ul className="footer__links">
                                <li><a href="#">Terms of Service</a></li>
                                <li><a href="#">Privacy Policy</a></li>
                                <li><a href="#">Repair Agreement</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer__bottom">
                        <span>© 2026 Guru Mobile Repair Solutions. All rights reserved.</span>
                        <span>Built with 💜 for better repairs.</span>
                    </div>
                </div>
            </footer>
        </>
    );
}

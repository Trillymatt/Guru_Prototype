import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import '../styles/faq.css';

const FAQ_CATEGORIES = [
    {
        id: 'about',
        label: 'About SEER',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
        ),
        faqs: [
            {
                q: 'What is SEER Mobile Repair?',
                a: 'SEER is a mobile iPhone repair service in the Dallas-Fort Worth area. We come to your home, office, or another convenient location — no store visit needed.'
            },
            {
                q: 'Are your technicians Apple Certified?',
                a: 'Yes, every SEER technician is Apple Certified and trained on iPhone repair standards.'
            },
            {
                q: 'What areas do you serve?',
                a: 'We currently serve the greater Dallas-Fort Worth metroplex. Enter your address during booking to confirm availability.'
            },
        ],
    },
    {
        id: 'repairs',
        label: 'Repairs & Scheduling',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
        ),
        faqs: [
            {
                q: 'What types of repairs do you perform?',
                a: 'Cracked screens, battery replacement, back glass, cameras, and more. All repairs are completed on-site at your location.'
            },
            {
                q: 'How long does a repair take?',
                a: 'Most repairs take under an hour. Screen replacements usually take 30-45 minutes.'
            },
            {
                q: 'Why must I book at least 3 days in advance?',
                a: 'We order parts specifically for your device and quality tier before your appointment. The 3-day window ensures everything arrives on time.'
            },
            {
                q: 'Can I cancel or reschedule?',
                a: 'Yes — from your dashboard or by contacting support. Please make changes at least 24 hours in advance to avoid losing the $29 service fee.'
            },
        ],
    },
    {
        id: 'parts',
        label: 'Parts & Policy',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
        ),
        faqs: [
            {
                q: 'What are the parts quality tiers?',
                a: 'Economy (budget aftermarket), Premium (high-grade aftermarket), and Genuine Apple (OEM). Choose the tier that fits your budget.'
            },
            {
                q: 'Do you offer a warranty on repairs?',
                a: 'No, repairs are provided as-is. Please review the Warranty Policy on our legal page before booking.'
            },
        ],
    },
    {
        id: 'pricing',
        label: 'Pricing & Payment',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
        ),
        faqs: [
            {
                q: 'What is the service fee?',
                a: 'There is a flat $29 service fee for technician travel and on-site service. It is added to parts cost and shown clearly during checkout.'
            },
            {
                q: 'How is pricing calculated?',
                a: 'Your total includes parts cost (based on your selected quality tier), a $29 service fee, and 8.25% Texas sales tax. We show full pricing upfront during the repair quiz.'
            },
            {
                q: 'When am I charged?',
                a: 'You are charged after the repair is complete and you approve the work. We only collect payment once the job is finished.'
            },
            {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit and debit cards. Payment processing details are available in our Terms of Service.'
            },
        ],
    },
];

function FAQItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
            <button className="faq-question" onClick={() => setOpen(!open)} aria-expanded={open}>
                <span>{q}</span>
                <div className="faq-chevron">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </div>
            </button>
            <div className="faq-answer">
                <p>{a}</p>
            </div>
        </div>
    );
}

export default function FAQPage() {
    const [activeCategory, setActiveCategory] = useState('about');

    const currentCategory = FAQ_CATEGORIES.find(c => c.id === activeCategory);

    return (
        <>
            <Navbar darkHero />

            {/* ─── Hero ─────────────────────────────────────────── */}
            <section className="faq-hero">
                <div className="guru-container">
                    <div className="faq-hero__content">
                        <div className="faq-hero__badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                            </svg>
                            Help Center
                        </div>
                        <h1 className="faq-hero__title">How can we help you?</h1>
                        <p className="faq-hero__subtitle">
                            Find answers to common questions about SEER repairs, scheduling, parts, and more.
                            Can't find what you need? Our team is here for you.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── FAQ Content ─────────────────────────────────── */}
            <section className="faq-section">
                <div className="guru-container">
                    <div className="faq-layout">

                        {/* Category Sidebar */}
                        <aside className="faq-sidebar">
                            <p className="faq-sidebar__label">Categories</p>
                            {FAQ_CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`faq-cat-btn ${activeCategory === cat.id ? 'faq-cat-btn--active' : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    <span className="faq-cat-btn__icon">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                </button>
                            ))}

                            <div className="faq-sidebar__divider" />

                            <div className="faq-sidebar__contact">
                                <p className="faq-sidebar__contact-label">24/7 Support</p>
                                <a href="tel:+14697654432" className="faq-sidebar__contact-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                                    </svg>
                                    (469) 765-4432
                                </a>
                            </div>
                        </aside>

                        {/* FAQ List */}
                        <div className="faq-content">
                            <div className="faq-content__header">
                                <span className="faq-cat-icon">{currentCategory.icon}</span>
                                <h2 className="faq-content__title">{currentCategory.label}</h2>
                            </div>
                            <div className="faq-list">
                                {currentCategory.faqs.map((item, i) => (
                                    <FAQItem key={i} q={item.q} a={item.a} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Contact Support ─────────────────────────────── */}
            <section className="support-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">Contact Support</h2>
                        <p className="support-subtitle">
                            Our team is available 24/7. Call, text, or email — we're here whenever you need us.
                        </p>
                    </div>

                    <div className="support-cards">
                        <div className="support-card">
                            <div className="support-card__icon support-card__icon--email">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Call or Text</h3>
                            <p className="support-card__desc">
                                Available 24/7 for questions, scheduling, or urgent support.
                            </p>
                            <a href="tel:+14697654432" className="support-card__link">
                                (469) 765-4432
                            </a>
                        </div>

                        <div className="support-card support-card--featured">
                            <div className="support-card__icon support-card__icon--repair">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Email Us</h3>
                            <p className="support-card__desc">
                                Best for billing, policies, or detailed questions.
                            </p>
                            <a href="mailto:support@seermrt.com" className="support-card__link">
                                support@seermrt.com
                            </a>
                        </div>

                        <div className="support-card">
                            <div className="support-card__icon support-card__icon--dashboard">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Book a Repair</h3>
                            <p className="support-card__desc">
                                Ready to fix your device? Start in under 2 minutes.
                            </p>
                            <Link to="/repair" className="guru-btn guru-btn--primary">
                                Start a Repair →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </>
    );
}

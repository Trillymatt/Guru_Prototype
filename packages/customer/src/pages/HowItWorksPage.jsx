import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import '../styles/faq.css';
import '../styles/marketing-pages.css';

const STEPS = [
    {
        number: '1',
        title: 'Diagnose',
        description: 'Tell us your iPhone model and what\'s wrong. We\'ll assess the issue and build a repair plan.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
        ),
    },
    {
        number: '2',
        title: 'Choose Your Parts',
        description: 'After diagnostics, pick from three quality tiers that fit your budget and expectations.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
        ),
    },
    {
        number: '3',
        title: 'Schedule',
        description: 'Pick a date and location. We book 3+ days out so parts arrive before your technician does.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
    },
    {
        number: '4',
        title: 'We Come to You',
        description: 'A certified technician arrives on-site, completes the repair, and walks you through the result.',
        icon: (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H21a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
            </svg>
        ),
    },
];

const TIERS = [
    {
        name: 'Economy',
        label: 'Budget-Friendly',
        price: '$',
        color: '#22C55E',
        bgColor: 'rgba(34, 197, 94, 0.08)',
        borderColor: 'rgba(34, 197, 94, 0.2)',
        description: 'Functional aftermarket parts. Gets the job done at the lowest cost.',
        perks: ['Aftermarket parts', 'Lowest price', 'Standard warranty'],
    },
    {
        name: 'Premium',
        label: 'Recommended',
        price: '$$',
        color: '#525462',
        bgColor: 'rgba(82, 84, 98, 0.06)',
        borderColor: 'rgba(82, 84, 98, 0.25)',
        description: 'High-quality parts with reliable performance and durability.',
        perks: ['High-quality parts', 'Best value', 'Extended warranty'],
        recommended: true,
    },
    {
        name: 'Genuine Apple',
        label: 'Best Quality',
        price: '$$$',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.06)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        description: 'Apple-certified OEM parts. Original quality guaranteed.',
        perks: ['OEM Apple parts', 'Original quality', 'Full warranty'],
    },
];

export default function HowItWorksPage() {
    return (
        <>
            <Navbar darkHero />

            <section className="faq-hero">
                <div className="guru-container">
                    <div className="faq-hero__content">
                        <div className="faq-hero__badge">How It Works</div>
                        <h1 className="faq-hero__title">Repair made simple</h1>
                        <p className="faq-hero__subtitle">
                            From diagnosis to doorstep — four steps, clear pricing, and a certified tech at your location.
                        </p>
                    </div>
                </div>
            </section>

            <section className="faq-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">The process in four steps</h2>
                        <p className="support-subtitle">
                            The same trusted workflow every time, so you know exactly what to expect in under 5 minutes.
                        </p>
                    </div>
                    <div className="support-cards hiw-steps-grid">
                        {STEPS.map((step) => (
                            <article key={step.number} className="support-card">
                                <div className="support-card__icon support-card__icon--email">{step.icon}</div>
                                <h3 className="support-card__title">{`Step ${step.number}: ${step.title}`}</h3>
                                <p className="support-card__desc">{step.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="support-section hiw-support-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">Three tiers. Your choice.</h2>
                        <p className="support-subtitle">
                            After diagnostics, choose the part quality that fits your budget.
                        </p>
                    </div>
                    <div className="support-cards hiw-tiers-grid">
                        {TIERS.map((tier) => (
                            <article
                                key={tier.name}
                                className={`support-card hiw-tier-support-card ${tier.recommended ? 'support-card--featured hiw-tier-support-card--featured' : ''}`}
                                style={{ '--tier-color': tier.color }}
                            >
                                <div className="hiw-tier-support-card__price">{tier.price}</div>
                                <h3 className="support-card__title">{tier.name}</h3>
                                <p className="hiw-tier-support-card__label">{tier.label}</p>
                                <p className="support-card__desc">{tier.description}</p>
                                <ul className="hiw-tier-support-card__perks">
                                    {tier.perks.map((perk) => (
                                        <li key={perk}>{perk}</li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                    <p className="hiw-tiers-note">
                        All tiers include a $29 service fee and 8.25% Texas sales tax. Final pricing shown before you confirm.
                    </p>
                </div>
            </section>

            <section className="support-section hiw-cta-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">Ready to get started?</h2>
                        <p className="support-subtitle">
                            Book in minutes. Upfront pricing. A certified tech at your door.
                        </p>
                    </div>
                    <div className="marketing-cta-actions">
                        <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg">Start a Repair →</Link>
                    </div>
                </div>
            </section>
            <SiteFooter />
        </>
    );
}

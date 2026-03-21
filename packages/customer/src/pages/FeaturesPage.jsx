import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import '../styles/faq.css';
import '../styles/marketing-pages.css';

const FEATURES = [
    {
        title: 'Mobile, on-site service',
        description: 'Your technician comes to your home, office, or preferred location to complete the repair.',
    },
    {
        title: 'Transparent pricing',
        description: 'See your repair total before booking with no surprise charges or hidden fees.',
    },
    {
        title: 'Certified expertise',
        description: 'Repairs are performed by Apple Certified technicians with real-world Apple experience.',
    },
    {
        title: 'Three parts tiers',
        description: 'Choose Economy, Premium, or Genuine Apple parts to match your priorities and budget.',
    },
    {
        title: 'Live repair updates',
        description: 'Track progress and communicate with your technician while your appointment is active.',
    },
    {
        title: 'On-demand is coming soon',
        description: 'Same-day urgent repair requests are in progress and will be released soon.',
        isHighlight: true,
    },
];

export default function FeaturesPage() {
    return (
        <>
            <Navbar darkHero />

            <section className="faq-hero">
                <div className="guru-container">
                    <div className="faq-hero__content">
                        <div className="faq-hero__badge">Features</div>
                        <h1 className="faq-hero__title">Built for reliability and convenience</h1>
                        <p className="faq-hero__subtitle">
                            SEER combines trusted technical standards with a smoother customer experience from booking to completion.
                        </p>
                    </div>
                </div>
            </section>

            <section className="marketing-section">
                <div className="guru-container">
                    <div className="marketing-grid">
                        {FEATURES.map((feature) => (
                            <article
                                key={feature.title}
                                className={`marketing-card ${feature.isHighlight ? 'marketing-card--highlight' : ''}`}
                            >
                                <h2 className="marketing-card__title">{feature.title}</h2>
                                <p className="marketing-card__description">{feature.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="support-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">Need help before booking?</h2>
                        <p className="support-subtitle">
                            Visit Support for answers to pricing, policies, scheduling, and repair expectations.
                        </p>
                    </div>
                    <div className="marketing-cta-actions">
                        <Link to="/faq" className="guru-btn guru-btn--primary guru-btn--lg">Visit Support</Link>
                        <Link to="/login" className="guru-btn guru-btn--ghost guru-btn--lg">Sign In</Link>
                    </div>
                </div>
            </section>
            <SiteFooter />
        </>
    );
}

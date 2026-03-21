import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import '../styles/faq.css';
import '../styles/marketing-pages.css';

export default function AboutPage() {
    return (
        <>
            <Navbar darkHero />
            <section className="faq-hero">
                <div className="guru-container">
                    <div className="faq-hero__content">
                        <div className="faq-hero__badge">About</div>
                        <h1 className="faq-hero__title">SEER Mobile Repairs</h1>
                        <p className="faq-hero__subtitle">
                            We bring certified iPhone repair directly to your home or office with clear pricing and real-time updates.
                        </p>
                    </div>
                </div>
            </section>

            <section className="marketing-section">
                <div className="guru-container">
                    <div className="marketing-grid">
                        <article className="marketing-card">
                            <h2 className="marketing-card__title">Our mission</h2>
                            <p className="marketing-card__description">
                                Remove the stress from phone repairs by making booking simple, communication clear, and service convenient.
                            </p>
                        </article>
                        <article className="marketing-card">
                            <h2 className="marketing-card__title">What makes us different</h2>
                            <p className="marketing-card__description">
                                Apple Certified technicians, transparent estimates, and on-site service designed around your schedule.
                            </p>
                        </article>
                        <article className="marketing-card marketing-card--highlight">
                            <h2 className="marketing-card__title">Service area</h2>
                            <p className="marketing-card__description">
                                Currently serving Dallas-Fort Worth with additional Texas cities planned as we grow.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="support-section">
                <div className="guru-container">
                    <div className="support-header">
                        <h2 className="support-title">Ready to book?</h2>
                        <p className="support-subtitle">Start your repair in minutes with a single guided flow.</p>
                    </div>
                    <div className="marketing-cta-actions">
                        <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--lg">Start a Repair →</Link>
                        <Link to="/faq" className="guru-btn guru-btn--ghost guru-btn--lg">Visit Support</Link>
                    </div>
                </div>
            </section>
            <SiteFooter />
        </>
    );
}

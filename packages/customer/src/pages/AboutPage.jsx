import React from 'react';
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
                            We repair your device, wherever you are.
                        </p>
                    </div>
                </div>
            </section>

            <section className="marketing-section">
                <div className="guru-container">
                    <div className="marketing-grid about-page__features">
                        <article className="marketing-card">
                            <h2 className="marketing-card__title">Who we are</h2>
                            <p className="marketing-card__description">
                                We are certified technicians committed to repairing your device with integrity, accuracy, and quality.
                            </p>
                        </article>
                        <article className="marketing-card">
                            <h2 className="marketing-card__title">Mission</h2>
                            <p className="marketing-card__description">
                                Our mission is to repair your smartphone, wherever you are. We bridge the gap between accessibility, and technology repair.
                            </p>
                        </article>
                        <article className="marketing-card">
                            <h2 className="marketing-card__title">What we do</h2>
                            <p className="marketing-card__description">
                                We repair or advise on your smart phone issues. We meet you wherever you are, repair and resolve your smartphone issue.
                            </p>
                        </article>
                    </div>
                </div>
            </section>

            <SiteFooter />
        </>
    );
}

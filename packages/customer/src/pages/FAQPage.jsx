import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/faq.css';

const FAQ_CATEGORIES = [
    {
        id: 'about',
        label: 'About Guru',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
        ),
        faqs: [
            {
                q: 'What is Guru Mobile Repair?',
                a: 'Guru is a mobile iPhone repair service serving the Dallas–Fort Worth area. Our Apple Certified technicians — many of whom are former Apple employees — come directly to you. Whether you\'re at home, the office, or a coffee shop, we repair your device on-site so you never have to visit a store.'
            },
            {
                q: 'Are your technicians Apple Certified?',
                a: 'Yes. Every Guru technician is Apple Certified and has hands-on experience working directly at Apple. Our team brings the same expertise you\'d find inside an Apple Store directly to your door — without the Genius Bar wait.'
            },
            {
                q: 'Is Guru a Christian company?',
                a: 'Yes. Guru was founded on Christian values — honesty, integrity, and excellence in everything we do. We strive to serve every customer the way we\'d want to be served, treating your device (and your time) with the care and respect it deserves.'
            },
            {
                q: 'What areas do you currently serve?',
                a: 'We currently serve the greater Dallas–Fort Worth metroplex. Enter your address during booking to confirm we cover your area. We\'re expanding — new cities are coming soon.'
            },
            {
                q: 'Do you repair Android or other devices?',
                a: 'At this time we specialize exclusively in iPhone repairs (iPhone 11 through iPhone 17). Our deep focus on Apple devices means we do one thing and do it exceptionally well.'
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
                a: 'We repair: Cracked screens, battery replacement, back glass, and cameras (front and rear). All repairs are completed on-site at your location.'
            },
            {
                q: 'How long does a repair take?',
                a: 'Most repairs are completed in under an hour. Screen replacements typically take 30–45 minutes. Complex repairs like water damage may take slightly longer. Your technician will give you an honest estimate when they arrive.'
            },
            {
                q: 'Why must I book at least 3 days in advance?',
                a: 'We order parts specifically for your repair to ensure quality and availability. The 3-day window allows us to source and receive the exact parts needed for your device model and chosen quality tier — so your technician arrives fully prepared.'
            },
            {
                q: 'Do I need to be present during the repair?',
                a: 'Yes. A responsible adult (18+) must be present for the repair, review the work, and sign off on completion. We take your device security seriously — we will never perform a repair without your direct oversight.'
            },
            {
                q: 'Can I cancel or reschedule my appointment?',
                a: 'Yes. You can cancel or reschedule through your dashboard or by contacting us directly. Please do so at least 24 hours before your appointment. Late cancellations may forfeit the $29 service fee, as parts will have already been ordered.'
            },
            {
                q: 'What if the repair can\'t be completed on-site?',
                a: 'In rare cases where a repair requires additional parts or a more complex fix, your technician will discuss next steps with you before proceeding. We are always transparent — no surprises.'
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
                q: 'What is the difference between Economy, Premium, and Genuine Apple parts?',
                a: 'Economy parts are quality aftermarket components — a solid budget option. Premium parts are high-quality aftermarket components that meet or exceed OEM specifications — our most popular tier. Genuine Apple (OEM) parts are original Apple components, offering maximum compatibility and the experience closest to factory specification. You choose the tier that fits your priorities and budget.'
            },
            {
                q: 'Do you offer a warranty on repairs?',
                a: 'No. All repairs are provided as-is and do not include any warranty on parts or labor. Once a repair is completed and signed off, no further claims can be made. Please review our full Warranty Policy on the legal page for details.'
            },
            {
                q: 'Will the repair void my Apple warranty?',
                a: 'Third-party repairs can affect Apple\'s limited hardware warranty. We use Genuine Apple (OEM) parts for customers who want to stay closest to Apple\'s standards. We recommend checking your current warranty status with Apple before proceeding if this is a concern.'
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
                a: 'There is a flat $29 service fee that covers the technician\'s travel and on-site time. This fee is charged in addition to the cost of parts and applies to every repair appointment. The service fee is shown transparently during checkout.'
            },
            {
                q: 'How is pricing calculated?',
                a: 'Your total is: parts cost (based on your chosen quality tier) + $29 service fee + 8.25% Texas sales tax. All pricing is shown upfront during the repair quiz — no hidden fees, ever.'
            },
            {
                q: 'When am I charged?',
                a: 'Payment is collected after the repair is completed and you have reviewed and signed off on the work. We believe you should only pay for a job well done.'
            },
            {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit and debit cards. Additional payment options are being added. Payment processing information is covered in our Terms of Service.'
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
                            Find answers to common questions about Guru repairs, scheduling, parts, and more.
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
                                <p className="faq-sidebar__contact-label">Still need help?</p>
                                <a href="mailto:support@gururepair.com" className="faq-sidebar__contact-btn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    Email Support
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
                            Our team is available Monday–Saturday, 8 AM – 7 PM CST.
                            We typically respond within a few hours.
                        </p>
                    </div>

                    <div className="support-cards">
                        <div className="support-card">
                            <div className="support-card__icon support-card__icon--email">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Email Us</h3>
                            <p className="support-card__desc">
                                Best for questions about existing repairs, billing, or policies.
                            </p>
                            <a href="mailto:support@gururepair.com" className="support-card__link">
                                support@gururepair.com
                            </a>
                        </div>

                        <div className="support-card support-card--featured">
                            <div className="support-card__icon support-card__icon--repair">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Book a Repair</h3>
                            <p className="support-card__desc">
                                Ready to fix your device? Start your repair in under 2 minutes.
                            </p>
                            <Link to="/repair" className="guru-btn guru-btn--primary">
                                Start a Repair →
                            </Link>
                        </div>

                        <div className="support-card">
                            <div className="support-card__icon support-card__icon--dashboard">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                                </svg>
                            </div>
                            <h3 className="support-card__title">Track Your Repair</h3>
                            <p className="support-card__desc">
                                Check status updates, chat with your technician, and view history.
                            </p>
                            <Link to="/dashboard" className="support-card__link">
                                Go to Dashboard →
                            </Link>
                        </div>
                    </div>
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
                                <li><Link to="/">About Us</Link></li>
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

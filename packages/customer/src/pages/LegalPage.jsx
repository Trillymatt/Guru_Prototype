import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/legal.css';

const SECTIONS = [
    { id: 'terms', label: 'Terms of Service' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'repair', label: 'Repair Agreement' },
    { id: 'warranty', label: 'Warranty Policy' },
];

function TermsOfService() {
    return (
        <div className="legal-doc">
            <p className="legal-updated">Last updated: January 1, 2026</p>

            <p className="legal-intro">
                Welcome to Guru Mobile Repair Solutions ("Guru," "we," "us," or "our"). By booking a repair
                or using our platform, you agree to these Terms of Service. Please read them carefully.
            </p>

            <h3>1. Services</h3>
            <p>
                Guru provides on-site iPhone repair services performed by Apple Certified technicians at locations
                designated by the customer. Services are currently available in the Dallas–Fort Worth metroplex.
                We reserve the right to decline any repair request at our discretion.
            </p>

            <h3>2. Eligibility</h3>
            <p>
                You must be at least 18 years of age to book a repair. By creating an account and booking
                a service, you represent and warrant that you are at least 18 years old and have the legal
                authority to agree to these Terms.
            </p>

            <h3>3. Booking & Scheduling</h3>
            <p>
                All repair appointments must be scheduled at least 3 days in advance to allow for parts
                procurement. Appointments are subject to technician availability. A $29 service fee is
                charged per appointment and covers travel and technician time regardless of whether the
                repair is completed. Parts costs are additional and are shown upfront during booking.
            </p>

            <h3>4. Cancellations & Rescheduling</h3>
            <p>
                You may cancel or reschedule an appointment with at least 24 hours' notice at no additional charge.
                Cancellations within 24 hours of the scheduled appointment may result in forfeiture of
                the $29 service fee, as parts will have already been ordered. Guru reserves the right to
                reschedule appointments due to technician unavailability or circumstances beyond our control.
            </p>

            <h3>5. Pricing & Payment</h3>
            <p>
                All pricing is disclosed before confirmation. Your total is calculated as: parts cost
                (based on your selected quality tier) + $29 service fee + applicable Texas state sales tax
                (8.25%). Payment is collected upon completion of the repair. We reserve the right to update
                pricing with reasonable notice.
            </p>

            <h3>6. Device Condition & Liability</h3>
            <p>
                You represent that you are the lawful owner of the device or have authorization to have it repaired.
                Guru is not liable for data loss, pre-existing conditions, or damage unrelated to the repair
                performed. We recommend backing up your device before any repair. Guru's liability is limited
                to the cost of the repair performed.
            </p>

            <h3>7. Intellectual Property</h3>
            <p>
                All content, logos, and branding on the Guru platform are the property of Guru Mobile Repair
                Solutions and may not be reproduced without written permission.
            </p>

            <h3>8. Governing Law</h3>
            <p>
                These Terms are governed by the laws of the State of Texas, without regard to conflict of
                law provisions. Any disputes shall be resolved in the courts of Dallas County, Texas.
            </p>

            <h3>9. Changes to Terms</h3>
            <p>
                We may update these Terms at any time. Continued use of our services after changes constitutes
                acceptance of the updated Terms. We will post the updated date at the top of this document.
            </p>

            <h3>10. Contact</h3>
            <p>
                Questions about these Terms? Contact us at{' '}
                <a href="mailto:legal@gururepair.com">legal@gururepair.com</a>.
            </p>
        </div>
    );
}

function PrivacyPolicy() {
    return (
        <div className="legal-doc">
            <p className="legal-updated">Last updated: January 1, 2026</p>

            <p className="legal-intro">
                Guru Mobile Repair Solutions ("Guru," "we," "us," or "our") is committed to protecting your
                personal information. This Privacy Policy explains how we collect, use, and safeguard your data.
            </p>

            <h3>1. Information We Collect</h3>
            <p>We collect the following information when you use Guru:</p>
            <ul>
                <li><strong>Account information:</strong> Name, email address, phone number.</li>
                <li><strong>Service information:</strong> Device model, repair type, parts selection, service address, appointment time.</li>
                <li><strong>Payment information:</strong> Processed securely through our payment provider. We do not store full card numbers.</li>
                <li><strong>Usage data:</strong> Pages visited, features used, and app interactions for improving our service.</li>
                <li><strong>Location data:</strong> Address you provide for the repair. We do not collect continuous background location.</li>
            </ul>

            <h3>2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul>
                <li>Provide, schedule, and complete repair services</li>
                <li>Communicate about your repair status and appointments</li>
                <li>Process payments and issue receipts</li>
                <li>Improve our platform and service quality</li>
                <li>Send service-related notifications (not marketing spam)</li>
            </ul>

            <h3>3. Information Sharing</h3>
            <p>
                We do not sell your personal information. We share data only with:
            </p>
            <ul>
                <li><strong>Assigned technicians:</strong> Only what is needed to perform your repair (name, address, device info).</li>
                <li><strong>Payment processors:</strong> Secure third-party payment providers.</li>
                <li><strong>Service providers:</strong> Email and notification systems used to contact you about your repair.</li>
                <li><strong>Legal requirements:</strong> When required by law or to protect the rights and safety of Guru and its customers.</li>
            </ul>

            <h3>4. Data Security</h3>
            <p>
                We use industry-standard encryption and security practices to protect your data. Our platform
                is built on Supabase with Row-Level Security policies ensuring your data is only accessible
                to you and authorized Guru personnel.
            </p>

            <h3>5. Data Retention</h3>
            <p>
                We retain your account data and repair history for as long as your account is active and for
                a reasonable period afterward to fulfill legal and business obligations. You may request
                deletion of your account at any time by contacting us.
            </p>

            <h3>6. Your Rights</h3>
            <p>You have the right to:</p>
            <ul>
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of non-essential communications</li>
            </ul>

            <h3>7. Cookies</h3>
            <p>
                We use authentication cookies and local storage to keep you logged in. We do not use
                tracking or advertising cookies.
            </p>

            <h3>8. Contact</h3>
            <p>
                For privacy concerns or data requests, contact us at{' '}
                <a href="mailto:privacy@gururepair.com">privacy@gururepair.com</a>.
            </p>
        </div>
    );
}

function RepairAgreement() {
    return (
        <div className="legal-doc">
            <p className="legal-updated">Last updated: January 1, 2026</p>

            <p className="legal-intro">
                This Repair Agreement ("Agreement") is entered into between you ("Customer") and Guru Mobile
                Repair Solutions ("Guru") at the time of repair completion and customer sign-off. By signing
                the digital completion form, you agree to the following terms.
            </p>

            <h3>1. Scope of Repair</h3>
            <p>
                The repair covers only the specific issue(s) selected during booking. Your assigned technician
                will confirm the scope before beginning work. Any additional repairs discovered during service
                will be communicated to you before proceeding — we will never perform work beyond what was
                agreed without your explicit consent.
            </p>

            <h3>2. Pre-Existing Conditions</h3>
            <p>
                Guru is not responsible for pre-existing damage or conditions present before the repair.
                Your technician may photograph pre-existing damage before beginning work. This documentation
                is available to you upon request.
            </p>

            <h3>3. Data & Personal Information</h3>
            <p>
                Repairs may require access to your device. The customer is solely responsible for backing
                up data before the repair. Guru technicians will not access personal files, photos, messages,
                or applications. Guru is not liable for data loss resulting from the repair process.
            </p>

            <h3>4. Device Ownership</h3>
            <p>
                By booking a repair, you represent that you are the rightful owner of the device or have
                explicit written authorization from the owner to have the device repaired. Guru reserves the
                right to refuse service if ownership cannot be reasonably established.
            </p>

            <h3>5. Right to Refuse</h3>
            <p>
                Guru technicians reserve the right to refuse or halt any repair if they determine the repair
                poses a safety risk, the device is unsupported, or conditions make safe repair impossible
                (e.g., severe structural damage, undisclosed liquid damage). In such cases, the service fee
                may still apply for the technician's time and travel.
            </p>

            <h3>6. Completion & Sign-Off</h3>
            <p>
                Upon completion of the repair, you will be asked to review the device and sign a digital
                completion form. Your signature confirms the repair was completed to your satisfaction.
                Any concerns must be raised before signing. Post-sign-off claims regarding repair quality
                are handled through our warranty policy.
            </p>

            <h3>7. Third-Party Software</h3>
            <p>
                Guru is not responsible for software issues (iOS updates, app crashes, operating system
                errors) unrelated to the hardware repair performed. Software diagnosis and optimization
                are separate services.
            </p>
        </div>
    );
}

function WarrantyPolicy() {
    return (
        <div className="legal-doc">
            <p className="legal-updated">Last updated: January 1, 2026</p>

            <p className="legal-intro">
                Guru stands behind the quality of every repair. Our warranty covers defects in parts and
                workmanship for the periods listed below. We want you to feel confident in choosing Guru —
                if something isn't right, we will make it right.
            </p>

            <div className="legal-warranty-tiers">
                <div className="legal-warranty-tier">
                    <div className="legal-warranty-tier__badge legal-warranty-tier__badge--eco">$</div>
                    <div className="legal-warranty-tier__info">
                        <h4>Economy Parts</h4>
                        <p>Aftermarket components. Quality aftermarket parts at the best price point.</p>
                    </div>
                    <div className="legal-warranty-tier__duration">30 days</div>
                </div>
                <div className="legal-warranty-tier">
                    <div className="legal-warranty-tier__badge legal-warranty-tier__badge--prem">$$</div>
                    <div className="legal-warranty-tier__info">
                        <h4>Premium Parts</h4>
                        <p>High-quality aftermarket components meeting or exceeding OEM spec.</p>
                    </div>
                    <div className="legal-warranty-tier__duration">90 days</div>
                </div>
                <div className="legal-warranty-tier">
                    <div className="legal-warranty-tier__badge legal-warranty-tier__badge--gen">$$$</div>
                    <div className="legal-warranty-tier__info">
                        <h4>Genuine Apple Parts</h4>
                        <p>Original Apple OEM components for maximum compatibility and fidelity.</p>
                    </div>
                    <div className="legal-warranty-tier__duration">180 days</div>
                </div>
            </div>

            <h3>What the Warranty Covers</h3>
            <ul>
                <li>Defects in the replacement part itself (dead pixels, touch failure, battery failure)</li>
                <li>Workmanship defects resulting from the installation process</li>
                <li>Failure of the repair to correct the reported issue</li>
            </ul>

            <h3>What the Warranty Does Not Cover</h3>
            <ul>
                <li>Accidental damage after the repair (drops, liquid exposure, crushing)</li>
                <li>Damage caused by unauthorized repair attempts by third parties after Guru's service</li>
                <li>Normal wear and tear on parts</li>
                <li>Software or operating system issues unrelated to hardware</li>
                <li>Pre-existing conditions documented before the repair</li>
                <li>Devices reported lost or stolen</li>
            </ul>

            <h3>How to Make a Warranty Claim</h3>
            <p>
                To file a warranty claim, contact us at{' '}
                <a href="mailto:warranty@gururepair.com">warranty@gururepair.com</a> within your warranty
                period with:
            </p>
            <ol>
                <li>Your name and repair order number</li>
                <li>Description of the issue</li>
                <li>Photos or video demonstrating the defect (if applicable)</li>
            </ol>
            <p>
                We will respond within one business day and schedule a follow-up repair at no cost if the
                claim is covered. Warranty service is performed by a Guru technician at a mutually agreed
                location.
            </p>

            <h3>Limitation of Liability</h3>
            <p>
                Guru's warranty liability is limited to repair or replacement of the defective part. We are
                not liable for consequential, incidental, or indirect damages. Our maximum liability under
                any warranty claim is limited to the original cost of the repair.
            </p>
        </div>
    );
}

const SECTION_COMPONENTS = {
    terms: <TermsOfService />,
    privacy: <PrivacyPolicy />,
    repair: <RepairAgreement />,
    warranty: <WarrantyPolicy />,
};

export default function LegalPage() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const initialSection = params.get('section') || 'terms';
    const [activeSection, setActiveSection] = useState(
        SECTIONS.find(s => s.id === initialSection) ? initialSection : 'terms'
    );

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeSection]);

    const currentSection = SECTIONS.find(s => s.id === activeSection);

    return (
        <>
            <Navbar />

            {/* ─── Hero ─────────────────────────────────────────── */}
            <section className="legal-hero">
                <div className="guru-container">
                    <div className="legal-hero__content">
                        <div className="legal-hero__badge">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            Legal & Policies
                        </div>
                        <h1 className="legal-hero__title">Your rights. Our commitments.</h1>
                        <p className="legal-hero__subtitle">
                            We believe in full transparency. Read our policies to understand exactly
                            what to expect when you choose Guru.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Legal Content ────────────────────────────────── */}
            <section className="legal-section">
                <div className="guru-container">
                    <div className="legal-layout">

                        {/* Sidebar navigation */}
                        <aside className="legal-sidebar">
                            <p className="legal-sidebar__label">Documents</p>
                            {SECTIONS.map(section => (
                                <button
                                    key={section.id}
                                    className={`legal-nav-btn ${activeSection === section.id ? 'legal-nav-btn--active' : ''}`}
                                    onClick={() => setActiveSection(section.id)}
                                >
                                    {section.label}
                                    {activeSection === section.id && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"/>
                                        </svg>
                                    )}
                                </button>
                            ))}

                            <div className="legal-sidebar__divider" />

                            <div className="legal-sidebar__note">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                                </svg>
                                <p>Questions? Email <a href="mailto:legal@gururepair.com">legal@gururepair.com</a></p>
                            </div>
                        </aside>

                        {/* Document content */}
                        <div className="legal-content">
                            <div className="legal-content__header">
                                <h2 className="legal-content__title">{currentSection.label}</h2>
                            </div>
                            {SECTION_COMPONENTS[activeSection]}
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
                            </ul>
                        </div>
                        <div>
                            <h4 className="footer__col-title">Legal</h4>
                            <ul className="footer__links">
                                <li><button className="footer__link-btn" onClick={() => setActiveSection('terms')}>Terms of Service</button></li>
                                <li><button className="footer__link-btn" onClick={() => setActiveSection('privacy')}>Privacy Policy</button></li>
                                <li><button className="footer__link-btn" onClick={() => setActiveSection('warranty')}>Warranty</button></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer__bottom">
                        <span>© 2026 Guru Mobile Repair Solutions. All rights reserved.</span>
                        <span>Built with care, faith, and purpose.</span>
                    </div>
                </div>
            </footer>
        </>
    );
}

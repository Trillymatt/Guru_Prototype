import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function SiteFooter() {
    const year = new Date().getFullYear();
    const footerRef = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = footerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setVisible(true);
            },
            { threshold: 0.05 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <footer ref={footerRef} className={`footer ${visible ? 'footer--visible' : ''}`}>
            <div className="guru-container">
                <div className="footer__grid">
                    <div>
                        <div className="footer__brand-name">SEER Mobile Repair</div>
                        <p className="footer__brand-desc">
                            On-site iPhone repair for Dallas-Fort Worth. Apple Certified technicians,
                            transparent pricing, and real-time repair updates.
                        </p>
                    </div>
                    <div>
                        <h4 className="footer__col-title">Company</h4>
                        <ul className="footer__links">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/how-it-works">How It Works</Link></li>
                            <li><Link to="/repair">Start a Repair</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="footer__col-title">Support</h4>
                        <ul className="footer__links">
                            <li><Link to="/faq">FAQ</Link></li>
                            <li><a href="mailto:support@seermobilerepair.com">support@seermobilerepair.com</a></li>
                            <li><span>Mon-Sat, 8:00 AM - 7:00 PM CST</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="footer__col-title">Legal</h4>
                        <ul className="footer__links">
                            <li><Link to="/legal">Terms of Service</Link></li>
                            <li><Link to="/legal?section=privacy">Privacy Policy</Link></li>
                            <li><Link to="/legal?section=warranty">Warranty Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="footer__bottom">
                    <span>{`© ${year} SEER Mobile Repair Solutions. All rights reserved.`}</span>
                    <span>Serving Dallas-Fort Worth, Texas</span>
                </div>
            </div>
        </footer>
    );
}

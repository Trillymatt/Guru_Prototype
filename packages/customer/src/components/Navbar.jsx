import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu on route change or resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
            <div className="guru-container navbar__inner">
                <Link to="/" className="navbar__logo" onClick={closeMenu}>
                    <div className="navbar__logo-icon">G</div>
                    Guru
                </Link>

                <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
                    <Link to="/" className="navbar__link" onClick={closeMenu}>Home</Link>
                    <a href="#how-it-works" className="navbar__link" onClick={closeMenu}>How It Works</a>
                    <a href="#features" className="navbar__link" onClick={closeMenu}>Features</a>
                    <Link to="/repair" className="navbar__link" onClick={closeMenu}>Start Repair</Link>
                    <div className="navbar__mobile-actions">
                        <Link to="/login" className="guru-btn guru-btn--ghost guru-btn--full" onClick={closeMenu}>Sign In</Link>
                        <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--full" onClick={closeMenu}>Get Started</Link>
                    </div>
                </div>

                <div className="navbar__actions">
                    <Link to="/login" className="guru-btn guru-btn--ghost guru-btn--sm">Sign In</Link>
                    <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--sm">Get Started</Link>
                </div>

                <button
                    className={`navbar__mobile-toggle ${menuOpen ? 'navbar__mobile-toggle--active' : ''}`}
                    aria-label="Menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>

            {/* Overlay */}
            {menuOpen && <div className="navbar__overlay" onClick={closeMenu} />}
        </nav>
    );
}

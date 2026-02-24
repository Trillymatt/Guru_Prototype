import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/AuthProvider';

export default function Navbar({ darkHero = false }) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();

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

    const handleSignOut = async () => {
        closeMenu();
        await signOut();
        navigate('/');
    };

    const isLoggedIn = !loading && user;

    return (
        <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${darkHero && !scrolled ? 'navbar--on-dark' : ''}`}>
            <div className="guru-container navbar__inner">
                <Link to="/" className="navbar__logo" onClick={closeMenu}>
                    <div className="navbar__logo-icon">G</div>
                    <div className="navbar__logo-text">
                        <span className="navbar__logo-name">Guru</span>
                        <span className="navbar__logo-tagline">Mobile Repairs</span>
                    </div>
                </Link>

                <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
                    <Link to="/" className="navbar__link" onClick={closeMenu}>Home</Link>
                    {isLoggedIn && (
                        <Link to="/dashboard" className="navbar__link" onClick={closeMenu}>My Repairs</Link>
                    )}
                    {!isLoggedIn && (
                        <>
                            <a href="/#how-it-works" className="navbar__link" onClick={closeMenu}>How It Works</a>
                            <a href="/#features" className="navbar__link" onClick={closeMenu}>Features</a>
                        </>
                    )}
                    <Link to="/faq" className="navbar__link" onClick={closeMenu}>Support</Link>
                    <Link to="/repair" className="navbar__link" onClick={closeMenu}>Start Repair</Link>
                    <div className="navbar__mobile-actions">
                        {isLoggedIn ? (
                            <>
                                <Link to="/dashboard" className="guru-btn guru-btn--ghost guru-btn--full" onClick={closeMenu}>My Repairs</Link>
                                <Link to="/profile" className="guru-btn guru-btn--ghost guru-btn--full" onClick={closeMenu}>Profile</Link>
                                <button className="guru-btn guru-btn--primary guru-btn--full" onClick={handleSignOut}>Sign Out</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="guru-btn guru-btn--ghost guru-btn--full" onClick={closeMenu}>Sign In</Link>
                                <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--full" onClick={closeMenu}>Get Started</Link>
                            </>
                        )}
                    </div>
                </div>

                <div className="navbar__actions">
                    {isLoggedIn ? (
                        <>
                            <Link to="/dashboard" className="guru-btn guru-btn--ghost guru-btn--sm">My Repairs</Link>
                            <Link to="/profile" className="navbar__profile-btn" aria-label="Profile">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </Link>
                            <button className="guru-btn guru-btn--primary guru-btn--sm" onClick={handleSignOut}>Sign Out</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="guru-btn guru-btn--ghost guru-btn--sm">Sign In</Link>
                            <Link to="/repair" className="guru-btn guru-btn--primary guru-btn--sm">Get Started</Link>
                        </>
                    )}
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

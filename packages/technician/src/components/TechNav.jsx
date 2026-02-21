import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@shared/supabase';

export default function TechNav() {
    const location = useLocation();
    const [techName, setTechName] = useState('Technician');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const fetchTechName = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: tech, error } = await supabase
                    .from('technicians')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Failed to fetch technician name:', error.message);
                    return;
                }
                if (tech?.full_name) setTechName(tech.full_name);
            } catch (err) {
                console.error('TechNav fetch error:', err.message);
            }
        };
        fetchTechName();
    }, []);

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <nav className="tech-nav" ref={menuRef}>
            <div className="guru-container tech-nav__inner">
                <Link to="/queue" className="tech-nav__logo">
                    <div className="tech-nav__logo-icon">G</div>
                    Guru
                    <span className="tech-nav__logo-badge">Tech</span>
                </Link>

                {/* Desktop links */}
                <div className="tech-nav__links">
                    <Link to="/queue" className={`tech-nav__link ${isActive('/queue') || isActive('/repair') ? 'tech-nav__link--active' : ''}`}>Queue</Link>
                    <Link to="/schedule" className={`tech-nav__link ${isActive('/schedule') ? 'tech-nav__link--active' : ''}`}>Schedule</Link>
                    <Link to="/inventory" className={`tech-nav__link ${isActive('/inventory') ? 'tech-nav__link--active' : ''}`}>Inventory</Link>
                    <Link to="/history" className={`tech-nav__link ${isActive('/history') ? 'tech-nav__link--active' : ''}`}>History</Link>
                </div>

                <div className="tech-nav__right">
                    <Link to="/profile" className="tech-nav__user">
                        <span>{techName}</span>
                        <div className="tech-nav__avatar">
                            {techName.charAt(0).toUpperCase()}
                        </div>
                    </Link>

                    {/* Mobile hamburger */}
                    <button
                        className={`tech-nav__hamburger ${menuOpen ? 'tech-nav__hamburger--open' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span className="tech-nav__hamburger-line" />
                        <span className="tech-nav__hamburger-line" />
                        <span className="tech-nav__hamburger-line" />
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="tech-nav__mobile-menu">
                    <Link to="/queue" className={`tech-nav__mobile-link ${isActive('/queue') || isActive('/repair') ? 'tech-nav__mobile-link--active' : ''}`}>Queue</Link>
                    <Link to="/schedule" className={`tech-nav__mobile-link ${isActive('/schedule') ? 'tech-nav__mobile-link--active' : ''}`}>Schedule</Link>
                    <Link to="/inventory" className={`tech-nav__mobile-link ${isActive('/inventory') ? 'tech-nav__mobile-link--active' : ''}`}>Inventory</Link>
                    <Link to="/history" className={`tech-nav__mobile-link ${isActive('/history') ? 'tech-nav__mobile-link--active' : ''}`}>History</Link>
                    <Link to="/profile" className={`tech-nav__mobile-link ${isActive('/profile') ? 'tech-nav__mobile-link--active' : ''}`}>Profile</Link>
                </div>
            )}
        </nav>
    );
}

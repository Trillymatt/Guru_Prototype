import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function AdminLayout({ children, onLogout, userEmail }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const location = useLocation();

    // Close drawer whenever the route changes
    useEffect(() => {
        setDrawerOpen(false);
    }, [location.pathname]);

    // Lock body scroll while the drawer is open on mobile
    useEffect(() => {
        if (drawerOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = prev; };
        }
    }, [drawerOpen]);

    // Close drawer on Escape
    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [drawerOpen]);

    return (
        <div className="admin-layout">
            {/* Mobile-only topbar with hamburger */}
            <header className="admin-topbar">
                <button
                    type="button"
                    className="admin-topbar__menu"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open navigation menu"
                    aria-expanded={drawerOpen}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
                <div className="admin-topbar__brand">
                    <span className="admin-topbar__logo">SEER</span>
                    <span className="admin-sidebar__badge">Admin</span>
                </div>
            </header>

            {/* Drawer backdrop (mobile) */}
            <div
                className={`admin-drawer-backdrop ${drawerOpen ? 'admin-drawer-backdrop--visible' : ''}`}
                onClick={() => setDrawerOpen(false)}
                aria-hidden="true"
            />

            <aside className={`admin-sidebar ${drawerOpen ? 'admin-sidebar--open' : ''}`}>
                <div className="admin-sidebar__header">
                    <span className="admin-sidebar__logo">SEER</span>
                    <span className="admin-sidebar__badge">Admin</span>
                    <button
                        type="button"
                        className="admin-sidebar__close"
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Close navigation menu"
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <nav className="admin-sidebar__nav">
                    <NavLink
                        to="/jobs"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                        </svg>
                        <span className="admin-sidebar__label">Jobs</span>
                    </NavLink>
                    <NavLink
                        to="/customers"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span className="admin-sidebar__label">Customers</span>
                    </NavLink>
                    <NavLink
                        to="/revenue"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span className="admin-sidebar__label">Revenue</span>
                    </NavLink>
                    <NavLink
                        to="/analytics"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        <span className="admin-sidebar__label">Analytics</span>
                    </NavLink>
                    <NavLink
                        to="/acquisition"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <span className="admin-sidebar__label">Acquisition</span>
                    </NavLink>
                    <NavLink
                        to="/referrals"
                        className={({ isActive }) =>
                            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
                        }
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 7h8" />
                            <path d="M8 12h8" />
                            <path d="M8 17h8" />
                            <circle cx="5" cy="7" r="1" />
                            <circle cx="5" cy="12" r="1" />
                            <circle cx="5" cy="17" r="1" />
                        </svg>
                        <span className="admin-sidebar__label">Referrals</span>
                    </NavLink>
                </nav>
                <div className="admin-sidebar__footer">
                    {userEmail && (
                        <span className="admin-sidebar__user">{userEmail}</span>
                    )}
                    <button onClick={onLogout} className="admin-sidebar__logout">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span className="admin-sidebar__label">Log Out</span>
                    </button>
                </div>
            </aside>
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

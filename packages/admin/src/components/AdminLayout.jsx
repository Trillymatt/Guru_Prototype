import React from 'react';
import { NavLink } from 'react-router-dom';

export default function AdminLayout({ children, onLogout, userEmail }) {
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar__header">
                    <span className="admin-sidebar__logo">GURU</span>
                    <span className="admin-sidebar__badge">Admin</span>
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
                        Jobs
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
                        Customers
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
                        Revenue
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
                        Analytics
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
                        Log Out
                    </button>
                </div>
            </aside>
            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

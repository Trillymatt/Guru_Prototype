import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@shared/supabase';

export default function TechNav() {
    const location = useLocation();
    const [techName, setTechName] = useState('Technician');

    useEffect(() => {
        const fetchTechName = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: tech } = await supabase
                .from('technicians')
                .select('full_name')
                .eq('id', user.id)
                .single();

            if (tech) setTechName(tech.full_name);
        };
        fetchTechName();
    }, []);

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <nav className="tech-nav">
            <div className="guru-container tech-nav__inner">
                <Link to="/queue" className="tech-nav__logo">
                    <div className="tech-nav__logo-icon">G</div>
                    Guru
                    <span className="tech-nav__logo-badge">Tech</span>
                </Link>
                <div className="tech-nav__links">
                    <Link
                        to="/queue"
                        className={`tech-nav__link ${isActive('/queue') || isActive('/repair') ? 'tech-nav__link--active' : ''}`}
                    >
                        Queue
                    </Link>
                    <Link
                        to="/history"
                        className={`tech-nav__link ${isActive('/history') ? 'tech-nav__link--active' : ''}`}
                    >
                        History
                    </Link>
                </div>
                <Link to="/profile" className="tech-nav__user">
                    <span>{techName}</span>
                    <div className="tech-nav__avatar">
                        {techName.charAt(0).toUpperCase()}
                    </div>
                </Link>
            </div>
        </nav>
    );
}

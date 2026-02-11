import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@shared/supabase';
import TechNav from '../components/TechNav';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [tech, setTech] = useState(null);
    const [stats, setStats] = useState({ completed: 0, active: 0, totalEarnings: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get technician profile
            const { data: techData } = await supabase
                .from('technicians')
                .select('*')
                .eq('id', user.id)
                .single();

            if (techData) {
                setTech({ ...techData, email: user.email });
            } else {
                setTech({ full_name: 'Technician', email: user.email });
            }

            // Get repair stats
            const { data: repairs } = await supabase
                .from('repairs')
                .select('status, total_estimate')
                .eq('technician_id', user.id);

            if (repairs) {
                const completed = repairs.filter(r => r.status === 'complete');
                const active = repairs.filter(r => r.status !== 'complete' && r.status !== 'cancelled');
                const totalEarnings = completed.reduce((sum, r) => sum + (parseFloat(r.total_estimate) || 0), 0);
                setStats({
                    completed: completed.length,
                    active: active.length,
                    totalEarnings,
                });
            }

            setLoading(false);
        };

        fetchProfile();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <>
                <TechNav />
                <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                    Loading profile...
                </div>
            </>
        );
    }

    return (
        <>
            <TechNav />

            <div className="queue-page">
                <div className="guru-container" style={{ maxWidth: 640 }}>
                    {/* Profile Header */}
                    <div className="repair-detail__section" style={{ textAlign: 'center', marginBottom: 24 }}>
                        <div style={{
                            width: 80, height: 80,
                            background: 'linear-gradient(135deg, var(--guru-purple-600), #6D28D9)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 800, fontSize: '2rem',
                            margin: '0 auto 16px',
                            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                        }}>
                            {tech?.full_name?.charAt(0).toUpperCase() || 'T'}
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>
                            {tech?.full_name || 'Technician'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            {tech?.email || '—'}
                        </p>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 16,
                        marginBottom: 24,
                    }}>
                        <div className="repair-detail__section" style={{ textAlign: 'center', marginBottom: 0 }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--guru-purple-600)' }}>
                                {stats.completed}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                                Completed
                            </div>
                        </div>
                        <div className="repair-detail__section" style={{ textAlign: 'center', marginBottom: 0 }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--guru-warning)' }}>
                                {stats.active}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                                Active
                            </div>
                        </div>
                        <div className="repair-detail__section" style={{ textAlign: 'center', marginBottom: 0 }}>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--guru-success)' }}>
                                ${stats.totalEarnings.toFixed(0)}
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                                Earnings
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="repair-detail__section" style={{ marginBottom: 24 }}>
                        <h2 className="repair-detail__section-title">Account Information</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Name</span>
                                <span style={{ fontWeight: 600 }}>{tech?.full_name || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Email</span>
                                <span style={{ fontWeight: 600 }}>{tech?.email || '—'}</span>
                            </div>
                            {tech?.phone && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Phone</span>
                                    <span style={{ fontWeight: 600 }}>{tech.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sign Out */}
                    <button
                        className="guru-btn guru-btn--full guru-btn--danger"
                        onClick={handleSignOut}
                        style={{
                            fontWeight: 700,
                            padding: '14px 24px',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
}

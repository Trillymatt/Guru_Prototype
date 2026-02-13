import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';

export default function ProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        if (!user) return;

        async function fetchProfile() {
            const { data, error: fetchErr } = await supabase
                .from('customers')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setForm({
                    full_name: data.full_name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                });
            }
            if (fetchErr) {
                setError('Could not load your profile.');
            }
            setLoading(false);
        }

        fetchProfile();
    }, [user]);

    const handleChange = (e) => {
        setSaved(false);
        setError('');
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSaved(false);

        // Basic validation
        if (!form.full_name.trim()) {
            setError('Name is required.');
            setSaving(false);
            return;
        }

        const { error: updateErr } = await supabase
            .from('customers')
            .update({
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
            })
            .eq('id', user.id);

        if (updateErr) {
            setError('Failed to save changes. Please try again.');
        } else {
            setSaved(true);
        }
        setSaving(false);
    };

    const initials = form.full_name
        ? form.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?';

    return (
        <>
            <Navbar />
            <div className="dashboard">
                <div className="guru-container guru-container--narrow">
                    <button
                        className="profile-back"
                        onClick={() => navigate('/dashboard')}
                    >
                        ← Back to Dashboard
                    </button>

                    <div className="profile-card animate-scale-in">
                        <div className="profile-avatar">{initials}</div>
                        <h1 className="profile-title">Your Profile</h1>
                        <p className="profile-subtitle">
                            Update your personal information below.
                        </p>

                        {loading ? (
                            <div className="dash-loading">Loading profile...</div>
                        ) : (
                            <form className="profile-form" onSubmit={handleSubmit}>
                                <div className="profile-field">
                                    <label className="profile-label" htmlFor="full_name">
                                        Full Name
                                    </label>
                                    <input
                                        className="guru-input"
                                        type="text"
                                        id="full_name"
                                        name="full_name"
                                        placeholder="John Doe"
                                        value={form.full_name}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label" htmlFor="email">
                                        Email Address
                                    </label>
                                    <input
                                        className="guru-input"
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="you@example.com"
                                        value={form.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label" htmlFor="phone">
                                        Phone Number
                                    </label>
                                    <input
                                        className="guru-input"
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        placeholder="(555) 123-4567"
                                        value={form.phone}
                                        onChange={handleChange}
                                    />
                                </div>

                                {error && (
                                    <div className="profile-error">{error}</div>
                                )}

                                {saved && (
                                    <div className="profile-success">
                                        Changes saved successfully!
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="guru-btn guru-btn--primary guru-btn--full"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

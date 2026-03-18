import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../styles/repair-quiz.css';
import { useAuth } from '@shared/AuthProvider';
import { supabase } from '@shared/supabase';
import { isValidPhone, isValidEmail } from '@shared/validation';
import { DEVICES, DEVICE_GENERATIONS, getDevicesByGeneration } from '@shared/constants';
import { BACK_GLASS_COLORS } from '@shared/constants';

// ─── Address Autocomplete ─────────────────────────────────────────────────────
function AddressAutocomplete({ value, onChange }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        if (query === value) return;
        clearTimeout(timerRef.current);
        if (query.length > 2) {
            timerRef.current = setTimeout(() => {
                setIsSearching(true);
                fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `format=json&q=${encodeURIComponent(query)}&countrycodes=us` +
                    `&addressdetails=1&limit=6`
                )
                    .then(res => res.json())
                    .then(data => {
                        const formatted = data
                            .filter(r => r.address && (r.type === 'house' || r.type === 'residential' || r.class === 'place' || r.class === 'building' || r.class === 'highway' || r.address.road))
                            .map(r => r.display_name.split(',').slice(0, 4).join(','));
                        setResults(formatted.length > 0 ? formatted : data.slice(0, 5).map(r => r.display_name.split(',').slice(0, 4).join(',')));
                        setIsSearching(false);
                    })
                    .catch(() => { setResults([]); setIsSearching(false); });
            }, 500);
        } else {
            setResults([]);
        }
        return () => clearTimeout(timerRef.current);
    }, [query]);

    const handleSelect = (display) => {
        setQuery(display);
        setResults([]);
        onChange(display);
    };

    return (
        <div className="address-search-container">
            <input
                className="guru-input"
                type="text"
                placeholder="1234 Oak Lawn Ave, Dallas, TX 75219"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e.target.value);
                }}
            />
            {isSearching && <div className="address-searching">Searching addresses...</div>}
            {results.length > 0 && (
                <div className="address-results">
                    {results.map((r, i) => (
                        <button key={i} className="address-result-item" type="button" onClick={() => handleSelect(r)}>
                            📍 {r}
                        </button>
                    ))}
                    <div className="address-api-note">Powered by OpenStreetMap</div>
                </div>
            )}
        </div>
    );
}

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

    // Saved devices state
    const [savedDevices, setSavedDevices] = useState([]);
    const [showAddDevice, setShowAddDevice] = useState(false);
    const [newDevice, setNewDevice] = useState({ device_id: '', device_name: '', device_color: '', nickname: '' });
    const [deviceGen, setDeviceGen] = useState('17');
    const [savingDevice, setSavingDevice] = useState(false);

    // Saved addresses state
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({ label: 'Home', address: '' });
    const [savingAddress, setSavingAddress] = useState(false);

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

        async function fetchDevices() {
            const { data } = await supabase
                .from('customer_devices')
                .select('*')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setSavedDevices(data);
        }

        async function fetchAddresses() {
            const { data } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setSavedAddresses(data);
        }

        fetchProfile();
        fetchDevices();
        fetchAddresses();
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

        if (!form.full_name.trim()) {
            setError('Name is required.');
            setSaving(false);
            return;
        }
        if (form.email.trim() && !isValidEmail(form.email.trim())) {
            setError('Please enter a valid email address.');
            setSaving(false);
            return;
        }
        if (form.phone.trim() && !isValidPhone(form.phone.trim())) {
            setError('Please enter a valid 10-digit US phone number.');
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

    // ─── Device Management ───
    const handleSelectDevice = (device) => {
        setNewDevice(prev => ({
            ...prev,
            device_id: device.id,
            device_name: device.name,
            device_color: '',
        }));
    };

    const handleSaveDevice = async () => {
        if (!newDevice.device_id) return;
        setSavingDevice(true);

        const { data, error: insertErr } = await supabase
            .from('customer_devices')
            .insert({
                customer_id: user.id,
                device_id: newDevice.device_id,
                device_name: newDevice.device_name,
                device_color: newDevice.device_color || null,
                nickname: newDevice.nickname.trim() || null,
                is_default: savedDevices.length === 0,
            })
            .select()
            .single();

        if (!insertErr && data) {
            setSavedDevices(prev => [data, ...prev]);
            setShowAddDevice(false);
            setNewDevice({ device_id: '', device_name: '', device_color: '', nickname: '' });
        }
        setSavingDevice(false);
    };

    const handleDeleteDevice = async (id) => {
        const { error: delErr } = await supabase
            .from('customer_devices')
            .delete()
            .eq('id', id);
        if (!delErr) {
            setSavedDevices(prev => prev.filter(d => d.id !== id));
        }
    };

    const handleSetDefaultDevice = async (id) => {
        // Clear all defaults first
        await supabase
            .from('customer_devices')
            .update({ is_default: false })
            .eq('customer_id', user.id);
        // Set the new default
        await supabase
            .from('customer_devices')
            .update({ is_default: true })
            .eq('id', id);
        setSavedDevices(prev =>
            prev.map(d => ({ ...d, is_default: d.id === id }))
        );
    };

    // ─── Address Management ───
    const handleSaveAddress = async () => {
        if (!newAddress.address.trim()) return;
        setSavingAddress(true);

        const { data, error: insertErr } = await supabase
            .from('customer_addresses')
            .insert({
                customer_id: user.id,
                label: newAddress.label,
                address: newAddress.address.trim(),
                is_default: savedAddresses.length === 0,
            })
            .select()
            .single();

        if (!insertErr && data) {
            setSavedAddresses(prev => [data, ...prev]);
            setShowAddAddress(false);
            setNewAddress({ label: 'Home', address: '' });
        }
        setSavingAddress(false);
    };

    const handleDeleteAddress = async (id) => {
        const { error: delErr } = await supabase
            .from('customer_addresses')
            .delete()
            .eq('id', id);
        if (!delErr) {
            setSavedAddresses(prev => prev.filter(a => a.id !== id));
        }
    };

    const handleSetDefaultAddress = async (id) => {
        await supabase
            .from('customer_addresses')
            .update({ is_default: false })
            .eq('customer_id', user.id);
        await supabase
            .from('customer_addresses')
            .update({ is_default: true })
            .eq('id', id);
        setSavedAddresses(prev =>
            prev.map(a => ({ ...a, is_default: a.id === id }))
        );
    };

    const initials = form.full_name
        ? form.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '?';

    const sortedGens = [...DEVICE_GENERATIONS].reverse();

    // Get available colors for selected device
    const getColorsForDevice = (deviceId) => {
        if (!BACK_GLASS_COLORS) return [];
        return BACK_GLASS_COLORS[deviceId] || [];
    };

    return (
        <>
            <Navbar />
            <div className="dashboard">
                <div className="guru-container guru-container--narrow">
                    <Link to="/dashboard" className="profile-back">
                        ← Back to Dashboard
                    </Link>

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

                    {/* ─── Saved Devices Section ─────── */}
                    <div className="profile-card" style={{ marginTop: 24 }}>
                        <div className="profile-section-header">
                            <h2 className="profile-section-title">My Devices</h2>
                            <button
                                className="guru-btn guru-btn--secondary guru-btn--sm"
                                onClick={() => setShowAddDevice(!showAddDevice)}
                            >
                                {showAddDevice ? 'Cancel' : '+ Add Device'}
                            </button>
                        </div>

                        {showAddDevice && (
                            <div className="profile-add-form">
                                <div className="profile-field">
                                    <label className="profile-label">Device Nickname (optional)</label>
                                    <input
                                        className="guru-input"
                                        type="text"
                                        placeholder="e.g., My Work Phone"
                                        value={newDevice.nickname}
                                        onChange={(e) => setNewDevice(prev => ({ ...prev, nickname: e.target.value }))}
                                    />
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Select Device</label>
                                    <div className="quiz__gen-tabs" style={{ marginBottom: 12 }}>
                                        {sortedGens.map((gen) => (
                                            <button
                                                key={gen}
                                                type="button"
                                                className={`quiz__gen-tab ${deviceGen === gen ? 'quiz__gen-tab--active' : ''}`}
                                                onClick={() => setDeviceGen(gen)}
                                            >
                                                {gen === 'SE' ? 'SE' : gen}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="profile-device-grid">
                                        {getDevicesByGeneration(deviceGen).map((device) => (
                                            <button
                                                key={device.id}
                                                type="button"
                                                className={`profile-device-chip ${newDevice.device_id === device.id ? 'profile-device-chip--selected' : ''}`}
                                                onClick={() => handleSelectDevice(device)}
                                            >
                                                {device.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newDevice.device_id && getColorsForDevice(newDevice.device_id).length > 0 && (
                                    <div className="profile-field">
                                        <label className="profile-label">Device Color</label>
                                        <div className="profile-color-grid">
                                            {getColorsForDevice(newDevice.device_id).map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`profile-color-chip ${newDevice.device_color === color ? 'profile-color-chip--selected' : ''}`}
                                                    onClick={() => setNewDevice(prev => ({ ...prev, device_color: color }))}
                                                >
                                                    {color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="guru-btn guru-btn--primary guru-btn--full"
                                    disabled={!newDevice.device_id || savingDevice}
                                    onClick={handleSaveDevice}
                                >
                                    {savingDevice ? 'Saving...' : 'Save Device'}
                                </button>
                            </div>
                        )}

                        {savedDevices.length === 0 && !showAddDevice && (
                            <p className="profile-empty-text">No saved devices yet. Add one to speed up your next repair booking.</p>
                        )}

                        <div className="profile-saved-list">
                            {savedDevices.map((device) => (
                                <div key={device.id} className={`profile-saved-item ${device.is_default ? 'profile-saved-item--default' : ''}`}>
                                    <div className="profile-saved-item__info">
                                        <span className="profile-saved-item__name">
                                            {device.nickname ? `${device.nickname} — ` : ''}{device.device_name}
                                        </span>
                                        {device.device_color && (
                                            <span className="profile-saved-item__detail">{device.device_color}</span>
                                        )}
                                        {device.is_default && (
                                            <span className="profile-saved-item__badge">Default</span>
                                        )}
                                    </div>
                                    <div className="profile-saved-item__actions">
                                        {!device.is_default && (
                                            <button
                                                className="profile-saved-item__btn"
                                                onClick={() => handleSetDefaultDevice(device.id)}
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            className="profile-saved-item__btn profile-saved-item__btn--delete"
                                            onClick={() => handleDeleteDevice(device.id)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Saved Addresses Section ─────── */}
                    <div className="profile-card" style={{ marginTop: 24, marginBottom: 48 }}>
                        <div className="profile-section-header">
                            <h2 className="profile-section-title">My Addresses</h2>
                            <button
                                className="guru-btn guru-btn--secondary guru-btn--sm"
                                onClick={() => setShowAddAddress(!showAddAddress)}
                            >
                                {showAddAddress ? 'Cancel' : '+ Add Address'}
                            </button>
                        </div>

                        {showAddAddress && (
                            <div className="profile-add-form">
                                <div className="profile-field">
                                    <label className="profile-label">Label</label>
                                    <div className="profile-label-chips">
                                        {['Home', 'Work', 'Other'].map((label) => (
                                            <button
                                                key={label}
                                                type="button"
                                                className={`profile-label-chip ${newAddress.label === label ? 'profile-label-chip--selected' : ''}`}
                                                onClick={() => setNewAddress(prev => ({ ...prev, label }))}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="profile-field">
                                    <label className="profile-label">Address</label>
                                    <AddressAutocomplete
                                        value={newAddress.address}
                                        onChange={(val) => setNewAddress(prev => ({ ...prev, address: val }))}
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="guru-btn guru-btn--primary guru-btn--full"
                                    disabled={!newAddress.address.trim() || savingAddress}
                                    onClick={handleSaveAddress}
                                >
                                    {savingAddress ? 'Saving...' : 'Save Address'}
                                </button>
                            </div>
                        )}

                        {savedAddresses.length === 0 && !showAddAddress && (
                            <p className="profile-empty-text">No saved addresses yet. Add one to speed up your next repair booking.</p>
                        )}

                        <div className="profile-saved-list">
                            {savedAddresses.map((addr) => (
                                <div key={addr.id} className={`profile-saved-item ${addr.is_default ? 'profile-saved-item--default' : ''}`}>
                                    <div className="profile-saved-item__info">
                                        <span className="profile-saved-item__label-tag">{addr.label}</span>
                                        <span className="profile-saved-item__name">{addr.address}</span>
                                        {addr.is_default && (
                                            <span className="profile-saved-item__badge">Default</span>
                                        )}
                                    </div>
                                    <div className="profile-saved-item__actions">
                                        {!addr.is_default && (
                                            <button
                                                className="profile-saved-item__btn"
                                                onClick={() => handleSetDefaultAddress(addr.id)}
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            className="profile-saved-item__btn profile-saved-item__btn--delete"
                                            onClick={() => handleDeleteAddress(addr.id)}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

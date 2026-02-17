import React, { useState, useEffect, useMemo } from 'react';
import TechNav from '../components/TechNav';
import { supabase } from '@shared/supabase';
import {
    DEVICES,
    DEVICE_GENERATIONS,
    getDevicesByGeneration,
    REPAIR_TYPES,
    PARTS_TIERS,
} from '@shared/constants';
import '../styles/tech-inventory.css';

export default function InventoryPage() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add/edit form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formDevice, setFormDevice] = useState('');
    const [formRepairType, setFormRepairType] = useState('');
    const [formTier, setFormTier] = useState('');
    const [formQuantity, setFormQuantity] = useState(0);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Filters
    const [filterDevice, setFilterDevice] = useState('');
    const [filterRepairType, setFilterRepairType] = useState('');
    const [activeGen, setActiveGen] = useState('');

    // Fetch inventory from Supabase
    useEffect(() => {
        const fetchInventory = async () => {
            const { data, error } = await supabase
                .from('parts_inventory')
                .select('*')
                .order('device', { ascending: true });

            if (!error && data) {
                setInventory(data);
            }
            setLoading(false);
        };

        fetchInventory();

        // Realtime subscription for live updates from other techs
        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'parts_inventory',
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setInventory(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                    setInventory(prev =>
                        prev.map(item => item.id === payload.new.id ? payload.new : item)
                    );
                } else if (payload.eventType === 'DELETE') {
                    setInventory(prev => prev.filter(item => item.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormDevice('');
        setFormRepairType('');
        setFormTier('');
        setFormQuantity(0);
        setFormError('');
    };

    const openAddForm = () => {
        resetForm();
        setShowForm(true);
    };

    const openEditForm = (item) => {
        setEditingId(item.id);
        setFormDevice(item.device);
        setFormRepairType(item.repair_type);
        setFormTier(item.parts_tier);
        setFormQuantity(item.quantity);
        setFormError('');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formDevice || !formRepairType || !formTier) {
            setFormError('Please fill in all fields.');
            return;
        }
        if (formQuantity < 0) {
            setFormError('Quantity cannot be negative.');
            return;
        }

        setSaving(true);
        setFormError('');

        const { data: { user } } = await supabase.auth.getUser();

        if (editingId) {
            // Update existing
            const { error } = await supabase
                .from('parts_inventory')
                .update({
                    quantity: formQuantity,
                    updated_by: user?.id,
                })
                .eq('id', editingId);

            if (error) {
                setFormError(error.message);
                setSaving(false);
                return;
            }
        } else {
            // Upsert (in case duplicate device+repair_type+tier)
            const { error } = await supabase
                .from('parts_inventory')
                .upsert({
                    device: formDevice,
                    repair_type: formRepairType,
                    parts_tier: formTier,
                    quantity: formQuantity,
                    updated_by: user?.id,
                }, { onConflict: 'device,repair_type,parts_tier' });

            if (error) {
                setFormError(error.message);
                setSaving(false);
                return;
            }
        }

        setSaving(false);
        resetForm();

        // Refetch after save (realtime will also catch it, but immediate feedback is better)
        const { data } = await supabase
            .from('parts_inventory')
            .select('*')
            .order('device', { ascending: true });
        if (data) setInventory(data);
    };

    const handleDelete = async (itemId) => {
        const { error } = await supabase
            .from('parts_inventory')
            .delete()
            .eq('id', itemId);

        if (!error) {
            setInventory(prev => prev.filter(item => item.id !== itemId));
        }
    };

    const handleQuickQuantityChange = async (item, delta) => {
        const newQty = Math.max(0, item.quantity + delta);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('parts_inventory')
            .update({ quantity: newQty, updated_by: user?.id })
            .eq('id', item.id);

        if (!error) {
            setInventory(prev =>
                prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i)
            );
        }
    };

    // Filtered inventory
    const filteredInventory = useMemo(() => {
        let result = inventory;
        if (filterDevice) {
            result = result.filter(item => item.device === filterDevice);
        }
        if (filterRepairType) {
            result = result.filter(item => item.repair_type === filterRepairType);
        }
        return result;
    }, [inventory, filterDevice, filterRepairType]);

    // Stats
    const totalItems = inventory.length;
    const inStockItems = inventory.filter(i => i.quantity > 0).length;
    const outOfStockItems = inventory.filter(i => i.quantity === 0).length;

    const sortedGens = [...DEVICE_GENERATIONS].reverse();

    // Get devices filtered by active generation (for the form)
    const formDeviceOptions = activeGen
        ? getDevicesByGeneration(activeGen)
        : DEVICES;

    return (
        <>
            <TechNav />
            <div className="inventory-page">
                <div className="guru-container">
                    <div className="inventory-header">
                        <div>
                            <h1 className="inventory-header__title">Parts Inventory</h1>
                            <p className="inventory-header__subtitle">
                                Shared across all technicians. Changes are live.
                            </p>
                        </div>
                        <button
                            className="guru-btn guru-btn--primary"
                            onClick={openAddForm}
                        >
                            + Add Part
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="inventory-stats">
                        <div className="inventory-stat">
                            <span className="inventory-stat__value">{totalItems}</span>
                            <span className="inventory-stat__label">Total Parts</span>
                        </div>
                        <div className="inventory-stat inventory-stat--success">
                            <span className="inventory-stat__value">{inStockItems}</span>
                            <span className="inventory-stat__label">In Stock</span>
                        </div>
                        <div className="inventory-stat inventory-stat--danger">
                            <span className="inventory-stat__value">{outOfStockItems}</span>
                            <span className="inventory-stat__label">Out of Stock</span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="inventory-filters">
                        <select
                            className="inventory-filter-select"
                            value={filterDevice}
                            onChange={(e) => setFilterDevice(e.target.value)}
                        >
                            <option value="">All Devices</option>
                            {DEVICES.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            className="inventory-filter-select"
                            value={filterRepairType}
                            onChange={(e) => setFilterRepairType(e.target.value)}
                        >
                            <option value="">All Repair Types</option>
                            {REPAIR_TYPES.filter(t => t.id !== 'software').map(t => (
                                <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Add/Edit Form Modal */}
                    {showForm && (
                        <div className="inventory-form-overlay" onClick={() => resetForm()}>
                            <div className="inventory-form" onClick={(e) => e.stopPropagation()}>
                                <h3 className="inventory-form__title">
                                    {editingId ? 'Edit Part Quantity' : 'Add Part to Inventory'}
                                </h3>

                                {!editingId && (
                                    <>
                                        {/* Device generation tabs */}
                                        <div className="inventory-form__field">
                                            <label className="inventory-form__label">Device Generation</label>
                                            <div className="inventory-gen-tabs">
                                                {sortedGens.map(gen => (
                                                    <button
                                                        key={gen}
                                                        className={`inventory-gen-tab ${activeGen === gen ? 'inventory-gen-tab--active' : ''}`}
                                                        onClick={() => {
                                                            setActiveGen(gen);
                                                            setFormDevice('');
                                                        }}
                                                    >
                                                        {gen === 'SE' ? 'SE' : gen}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="inventory-form__field">
                                            <label className="inventory-form__label">Device</label>
                                            <select
                                                className="inventory-filter-select"
                                                value={formDevice}
                                                onChange={(e) => setFormDevice(e.target.value)}
                                            >
                                                <option value="">Select a device...</option>
                                                {formDeviceOptions.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="inventory-form__field">
                                            <label className="inventory-form__label">Repair Type</label>
                                            <select
                                                className="inventory-filter-select"
                                                value={formRepairType}
                                                onChange={(e) => setFormRepairType(e.target.value)}
                                            >
                                                <option value="">Select repair type...</option>
                                                {REPAIR_TYPES.filter(t => t.id !== 'software').map(t => (
                                                    <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="inventory-form__field">
                                            <label className="inventory-form__label">Parts Tier</label>
                                            <div className="inventory-tier-options">
                                                {PARTS_TIERS.map(tier => (
                                                    <button
                                                        key={tier.id}
                                                        className={`inventory-tier-btn ${formTier === tier.id ? 'inventory-tier-btn--active' : ''}`}
                                                        onClick={() => setFormTier(tier.id)}
                                                        style={formTier === tier.id ? { borderColor: tier.color, background: `${tier.color}15` } : undefined}
                                                    >
                                                        <span className="inventory-tier-btn__dot" style={{ background: tier.color }}></span>
                                                        <span className="inventory-tier-btn__name">{tier.name}</span>
                                                        <span className="inventory-tier-btn__price">{tier.priceLabel}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {editingId && (
                                    <div className="inventory-form__edit-info">
                                        <span>{formDevice}</span>
                                        <span>{REPAIR_TYPES.find(t => t.id === formRepairType)?.name || formRepairType}</span>
                                        <span className="inventory-tier-tag" style={{ color: PARTS_TIERS.find(t => t.id === formTier)?.color }}>
                                            {PARTS_TIERS.find(t => t.id === formTier)?.name}
                                        </span>
                                    </div>
                                )}

                                <div className="inventory-form__field">
                                    <label className="inventory-form__label">Quantity</label>
                                    <div className="inventory-qty-input">
                                        <button
                                            className="inventory-qty-btn"
                                            onClick={() => setFormQuantity(Math.max(0, formQuantity - 1))}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            className="inventory-qty-value"
                                            value={formQuantity}
                                            onChange={(e) => setFormQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                            min="0"
                                        />
                                        <button
                                            className="inventory-qty-btn"
                                            onClick={() => setFormQuantity(formQuantity + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {formError && (
                                    <div className="inventory-form__error">{formError}</div>
                                )}

                                <div className="inventory-form__actions">
                                    <button className="guru-btn guru-btn--ghost" onClick={resetForm}>
                                        Cancel
                                    </button>
                                    <button
                                        className="guru-btn guru-btn--primary"
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : editingId ? 'Update Quantity' : 'Add to Inventory'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inventory Table */}
                    {loading ? (
                        <div className="inventory-loading">Loading inventory...</div>
                    ) : filteredInventory.length === 0 ? (
                        <div className="inventory-empty">
                            <div className="inventory-empty__icon">📦</div>
                            <h3>No parts in inventory</h3>
                            <p>Add parts to track your stock levels. Customers will see part availability in real-time.</p>
                        </div>
                    ) : (
                        <div className="inventory-table-wrapper">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Device</th>
                                        <th>Repair Type</th>
                                        <th>Tier</th>
                                        <th>Qty</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInventory.map(item => {
                                        const repairType = REPAIR_TYPES.find(t => t.id === item.repair_type);
                                        const tier = PARTS_TIERS.find(t => t.id === item.parts_tier);
                                        const isOutOfStock = item.quantity === 0;
                                        const isLowStock = item.quantity > 0 && item.quantity <= 2;

                                        return (
                                            <tr key={item.id} className={isOutOfStock ? 'inventory-row--out' : ''}>
                                                <td className="inventory-cell--device">{item.device}</td>
                                                <td>
                                                    <span className="inventory-repair-name">
                                                        {repairType?.icon} {repairType?.name || item.repair_type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="inventory-tier-tag" style={{ color: tier?.color }}>
                                                        {tier?.name || item.parts_tier}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="inventory-qty-controls">
                                                        <button
                                                            className="inventory-qty-sm-btn"
                                                            onClick={() => handleQuickQuantityChange(item, -1)}
                                                            disabled={item.quantity === 0}
                                                        >
                                                            -
                                                        </button>
                                                        <span className="inventory-qty-display">{item.quantity}</span>
                                                        <button
                                                            className="inventory-qty-sm-btn"
                                                            onClick={() => handleQuickQuantityChange(item, 1)}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    {isOutOfStock ? (
                                                        <span className="inventory-status inventory-status--out">Out of Stock</span>
                                                    ) : isLowStock ? (
                                                        <span className="inventory-status inventory-status--low">Low Stock</span>
                                                    ) : (
                                                        <span className="inventory-status inventory-status--in">In Stock</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="inventory-actions">
                                                        <button
                                                            className="inventory-action-btn"
                                                            onClick={() => openEditForm(item)}
                                                            title="Edit quantity"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="inventory-action-btn inventory-action-btn--delete"
                                                            onClick={() => handleDelete(item.id)}
                                                            title="Remove from inventory"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

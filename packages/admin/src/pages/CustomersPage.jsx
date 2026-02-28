import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '../supabaseAdmin';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [repairCounts, setRepairCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGuru, setFilterGuru] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        if (!supabaseAdmin) { setLoading(false); return; }
        setLoading(true);

        const { data: custData } = await supabaseAdmin
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        const { data: repairData } = await supabaseAdmin
            .from('repairs')
            .select('customer_id, status');

        // Count repairs per customer
        const counts = {};
        (repairData || []).forEach(r => {
            if (!r.customer_id) return;
            if (!counts[r.customer_id]) {
                counts[r.customer_id] = { total: 0, active: 0 };
            }
            counts[r.customer_id].total++;
            if (r.status !== 'complete' && r.status !== 'cancelled') {
                counts[r.customer_id].active++;
            }
        });

        setCustomers(custData || []);
        setRepairCounts(counts);
        setLoading(false);
    }

    const filteredCustomers = useMemo(() => {
        let result = customers;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c =>
                (c.full_name || '').toLowerCase().includes(q) ||
                (c.phone || '').includes(q) ||
                (c.email || '').toLowerCase().includes(q)
            );
        }
        if (filterGuru === 'plus') {
            result = result.filter(c => c.guru_plus_subscriber);
        } else if (filterGuru === 'standard') {
            result = result.filter(c => !c.guru_plus_subscriber);
        }
        return result;
    }, [customers, searchQuery, filterGuru]);

    async function toggleGuruPlus(customerId, currentValue) {
        await supabaseAdmin
            .from('customers')
            .update({ guru_plus_subscriber: !currentValue })
            .eq('id', customerId);
        fetchCustomers();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Customers</h1>
                    <p className="admin-page__subtitle">{customers.length} total customers</p>
                </div>
            </div>

            <div className="admin-filters">
                <div className="admin-filters__tabs">
                    <button
                        className={`admin-filters__tab ${filterGuru === 'all' ? 'admin-filters__tab--active' : ''}`}
                        onClick={() => setFilterGuru('all')}
                    >
                        All ({customers.length})
                    </button>
                    <button
                        className={`admin-filters__tab ${filterGuru === 'plus' ? 'admin-filters__tab--active' : ''}`}
                        onClick={() => setFilterGuru('plus')}
                    >
                        Guru Plus ({customers.filter(c => c.guru_plus_subscriber).length})
                    </button>
                    <button
                        className={`admin-filters__tab ${filterGuru === 'standard' ? 'admin-filters__tab--active' : ''}`}
                        onClick={() => setFilterGuru('standard')}
                    >
                        Standard ({customers.filter(c => !c.guru_plus_subscriber).length})
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-filters__search"
                />
            </div>

            {loading ? (
                <div className="admin-loading">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="admin-empty">No customers found</div>
            ) : (
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Jobs</th>
                                <th>Active</th>
                                <th>Guru Plus</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(customer => {
                                const counts = repairCounts[customer.id] || { total: 0, active: 0 };
                                return (
                                    <tr key={customer.id} className="admin-table__row--clickable" onClick={() => navigate(`/customers/${customer.id}`)}>
                                        <td>
                                            <span className="admin-table__name">{customer.full_name || 'Unknown'}</span>
                                        </td>
                                        <td>{customer.phone || '—'}</td>
                                        <td>{customer.email || '—'}</td>
                                        <td>{counts.total}</td>
                                        <td>
                                            {counts.active > 0 && (
                                                <span className="admin-badge admin-badge--active">{counts.active}</span>
                                            )}
                                            {counts.active === 0 && '0'}
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className={`admin-guru-plus-toggle ${customer.guru_plus_subscriber ? 'admin-guru-plus-toggle--active' : ''}`}
                                                onClick={() => toggleGuruPlus(customer.id, customer.guru_plus_subscriber)}
                                            >
                                                {customer.guru_plus_subscriber ? 'Active' : 'No'}
                                            </button>
                                        </td>
                                        <td>{formatDate(customer.created_at)}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => navigate(`/customers/${customer.id}`)}
                                                className="admin-btn-icon"
                                                title="View Details"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { getInstitutions } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const ROLES = [
    { value: 'admin', label: 'Administrator' },
    { value: 'loan_officer', label: 'Loan Officer' },
    { value: 'branch_manager', label: 'Branch Manager' },
    { value: 'auditor', label: 'Auditor/Viewer' },
];

const ROLE_COLORS = {
    admin: '#1a237e',
    loan_officer: '#2e7d32',
    branch_manager: '#e65100',
    auditor: '#6a1b9a',
};

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        role: 'loan_officer',
        institution: '',
        password: '',
        is_active: true,
    });

    const token = localStorage.getItem('access_token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users/`, { headers });
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        getInstitutions().then(res => setInstitutions(res.data)).catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const openCreate = () => {
        setEditUser(null);
        setForm({
            username: '', first_name: '', last_name: '',
            email: '', phone_number: '', role: 'loan_officer',
            institution: '', password: '', is_active: true,
        });
        setError('');
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditUser(user);
        setForm({
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number || '',
            role: user.role,
            institution: user.institution || '',
            password: '',
            is_active: user.is_active,
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setError('');
        if (!form.username) { setError('Username is required.'); return; }
        if (!editUser && !form.password) { setError('Password is required for new users.'); return; }

        const body = { ...form };
        if (!body.password) delete body.password;
        if (!body.institution) delete body.institution;

        try {
            const url = editUser
                ? `${API_BASE}/users/${editUser.id}/`
                : `${API_BASE}/users/`;
            const method = editUser ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
            if (!res.ok) {
                const data = await res.json();
                setError(JSON.stringify(data));
                return;
            }
            setSuccess(editUser ? 'User updated successfully!' : 'User created successfully!');
            setShowModal(false);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Operation failed. Please try again.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API_BASE}/users/${id}/`, { method: 'DELETE', headers });
            setUsers(users.filter(u => u.id !== id));
            setDeleteConfirm(null);
            setSuccess('User deleted successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Delete failed.');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await fetch(`${API_BASE}/users/${user.id}/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ is_active: !user.is_active }),
            });
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
        } catch (err) {
            setError('Failed to update user status.');
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.topBar}>
                <h2 style={styles.heading}>👥 User Management</h2>
                <button style={styles.createBtn} onClick={openCreate}>
                    + Add New User
                </button>
            </div>

            {success && <div style={styles.success}>{success}</div>}
            {error && !showModal && <div style={styles.errorBox}>{error}</div>}

            {/* Stats */}
            <div style={styles.statsRow}>
                {ROLES.map(role => {
                    const count = users.filter(u => u.role === role.value).length;
                    return (
                        <div key={role.value} style={{ ...styles.statCard, borderTop: `4px solid ${ROLE_COLORS[role.value]}` }}>
                            <p style={styles.statLabel}>{role.label}</p>
                            <p style={{ ...styles.statValue, color: ROLE_COLORS[role.value] }}>{count}</p>
                        </div>
                    );
                })}
                <div style={{ ...styles.statCard, borderTop: '4px solid #333' }}>
                    <p style={styles.statLabel}>Total Users</p>
                    <p style={styles.statValue}>{users.length}</p>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={styles.loading}>Loading users...</div>
            ) : users.length === 0 ? (
                <div style={styles.empty}>No users found.</div>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thead}>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Username</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Role</th>
                                <th style={styles.th}>Institution</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={styles.tr}>
                                    <td style={styles.td}>{u.first_name} {u.last_name}</td>
                                    <td style={styles.td}>{u.username}</td>
                                    <td style={styles.td}>{u.email}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.roleBadge, background: ROLE_COLORS[u.role] || '#888' }}>
                                            {ROLES.find(r => r.value === u.role)?.label || u.role}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{u.institution_name || '—'}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.statusBadge, background: u.is_active ? '#2e7d32' : '#b71c1c' }}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <button style={styles.editBtn} onClick={() => openEdit(u)}>✏️ Edit</button>
                                        <button style={styles.toggleBtn} onClick={() => handleToggleActive(u)}>
                                            {u.is_active ? '🔒 Deactivate' : '✅ Activate'}
                                        </button>
                                        <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(u.id)}>🗑</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div style={styles.overlay}>
                    <div style={styles.confirmBox}>
                        <h3 style={{ color: '#b71c1c', marginBottom: '12px' }}>⚠️ Confirm Delete</h3>
                        <p style={{ marginBottom: '20px', color: '#333' }}>
                            Are you sure you want to delete this user? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button style={styles.confirmDeleteBtn} onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</button>
                            <button style={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div style={styles.overlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{editUser ? '✏️ Edit User' : '+ Create New User'}</h3>
                            <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        {error && <div style={styles.errorBox}>{error}</div>}

                        <div style={styles.formGrid}>
                            <div style={styles.field}>
                                <label style={styles.label}>Username *</label>
                                <input style={styles.input} value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                    placeholder="e.g. john_doe" />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Role *</label>
                                <select style={styles.input} value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>First Name</label>
                                <input style={styles.input} value={form.first_name}
                                    onChange={e => setForm({ ...form, first_name: e.target.value })}
                                    placeholder="First name" />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Last Name</label>
                                <input style={styles.input} value={form.last_name}
                                    onChange={e => setForm({ ...form, last_name: e.target.value })}
                                    placeholder="Last name" />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Email</label>
                                <input style={styles.input} type="email" value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="email@example.com" />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Phone Number</label>
                                <input style={styles.input} value={form.phone_number}
                                    onChange={e => setForm({ ...form, phone_number: e.target.value })}
                                    placeholder="e.g. 0788000000" />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Institution</label>
                                <select style={styles.input} value={form.institution}
                                    onChange={e => setForm({ ...form, institution: e.target.value })}>
                                    <option value="">No Institution</option>
                                    {institutions.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                                <input style={styles.input} type="password" value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder="Enter password" />
                            </div>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>
                                <input type="checkbox" checked={form.is_active}
                                    onChange={e => setForm({ ...form, is_active: e.target.checked })}
                                    style={{ marginRight: '8px' }} />
                                Active (user can login)
                            </label>
                        </div>

                        <div style={styles.modalActions}>
                            <button style={styles.saveBtn} onClick={handleSubmit}>
                                {editUser ? 'Save Changes' : 'Create User'}
                            </button>
                            <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '24px' },
    topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    heading: { fontSize: '22px', fontWeight: '700', color: '#1a237e', margin: 0 },
    createBtn: { padding: '10px 20px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    success: { background: '#e8f5e9', color: '#2e7d32', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600' },
    errorBox: { background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '16px' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '24px' },
    statCard: { background: '#fff', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' },
    statLabel: { fontSize: '11px', color: '#888', margin: '0 0 6px 0', textTransform: 'uppercase', fontWeight: '600' },
    statValue: { fontSize: '28px', fontWeight: '800', color: '#1a237e', margin: 0 },
    loading: { textAlign: 'center', padding: '40px', color: '#888' },
    empty: { textAlign: 'center', padding: '40px', color: '#888' },
    tableWrapper: { background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { background: '#1a237e' },
    th: { padding: '14px 16px', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'left' },
    tr: { borderBottom: '1px solid #f0f0f0' },
    td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
    roleBadge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    statusBadge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    editBtn: { padding: '5px 10px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' },
    toggleBtn: { padding: '5px 10px', background: '#f57f17', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' },
    deleteBtn: { padding: '5px 10px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    confirmBox: { background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modal: { background: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '18px', fontWeight: '700', color: '#1a237e', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
    modalActions: { display: 'flex', gap: '12px', marginTop: '20px' },
    saveBtn: { flex: 1, padding: '12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '12px', background: '#757575', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    confirmDeleteBtn: { flex: 1, padding: '12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
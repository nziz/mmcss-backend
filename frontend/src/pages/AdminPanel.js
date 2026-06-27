import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000/api';
const getToken = () => localStorage.getItem('access_token');

export default function AdminPanel() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [message, setMessage] = useState('');
    const [editingRule, setEditingRule] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [activeTab, setActiveTab] = useState('rules');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchRules();
        fetchStats();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await axios.get(`${API}/rules/`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setRules(res.data);
        } catch (err) {
            setMessage('Failed to load scoring rules.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API}/dashboard/stats/`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setStats(res.data);
        } catch (err) {}
    };

    const startEdit = (rule) => {
        setEditingRule(rule.id);
        setEditValues({
            points_awarded: rule.points_awarded,
            min_value: rule.min_value,
            max_value: rule.max_value,
        });
    };

    const saveRule = async (ruleId) => {
        setSaving(ruleId);
        setMessage('');
        try {
            await axios.put(
                `${API}/rules/${ruleId}/`,
                editValues,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setMessage('✅ Rule updated successfully!');
            setEditingRule(null);
            fetchRules();
        } catch (err) {
            setMessage('❌ Failed to update rule. Admin access required.');
        } finally {
            setSaving(null);
        }
    };

    // Group rules by indicator
    const groupedRules = rules.reduce((acc, rule) => {
        const key = rule.indicator_display || rule.indicator;
        if (!acc[key]) acc[key] = [];
        acc[key].push(rule);
        return acc;
    }, {});

    const indicatorColors = {
        'Transaction Frequency': '#1a237e',
        'Average Transaction Value': '#1565c0',
        'Savings Consistency': '#2e7d32',
        'Bill Payment Regularity': '#f57f17',
        'Network Diversity': '#6a1b9a',
        'Account Age': '#00695c',
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>⚙️ Admin Panel</h2>
            <p style={styles.subtitle}>Manage scoring rules and view system statistics</p>

            {/* Tabs */}
            <div style={styles.tabs}>
                {['rules', 'stats'].map(tab => (
                    <button
                        key={tab}
                        style={activeTab === tab ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'rules' ? '📋 Scoring Rules' : '📊 System Stats'}
                    </button>
                ))}
            </div>

            {message && (
                <div style={{
                    ...styles.message,
                    background: message.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                    color: message.startsWith('✅') ? '#2e7d32' : '#c62828',
                }}>
                    {message}
                </div>
            )}

            {/* RULES TAB */}
            {activeTab === 'rules' && (
                <div>
                    <div style={styles.infoBox}>
                        <p style={styles.infoText}>
                            ℹ️ These are the active scoring rules loaded into the system.
                            As administrator, you can update point allocations and thresholds.
                            Changes take effect immediately on the next scoring computation.
                        </p>
                    </div>

                    {loading ? (
                        <div style={styles.loading}>Loading scoring rules...</div>
                    ) : (
                        Object.entries(groupedRules).map(([indicator, indicatorRules]) => (
                            <div key={indicator} style={styles.ruleGroup}>
                                <div style={{
                                    ...styles.ruleGroupHeader,
                                    borderLeft: `5px solid ${indicatorColors[indicator] || '#1a237e'}`,
                                }}>
                                    <h3 style={styles.ruleGroupTitle}>{indicator}</h3>
                                    <span style={styles.maxPoints}>
                                        Max: {indicatorRules[0]?.max_points} pts
                                    </span>
                                </div>

                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHead}>
                                            <th style={styles.th}>Condition</th>
                                            <th style={styles.th}>Min Value</th>
                                            <th style={styles.th}>Max Value</th>
                                            <th style={styles.th}>Points</th>
                                            <th style={styles.th}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {indicatorRules.map(rule => (
                                            <tr key={rule.id} style={styles.tableRow}>
                                                <td style={styles.td}>{rule.condition_label}</td>
                                                <td style={styles.td}>
                                                    {editingRule === rule.id ? (
                                                        <input
                                                            style={styles.editInput}
                                                            type="number"
                                                            value={editValues.min_value ?? ''}
                                                            onChange={e => setEditValues({
                                                                ...editValues,
                                                                min_value: e.target.value
                                                            })}
                                                        />
                                                    ) : (rule.min_value ?? '—')}
                                                </td>
                                                <td style={styles.td}>
                                                    {editingRule === rule.id ? (
                                                        <input
                                                            style={styles.editInput}
                                                            type="number"
                                                            value={editValues.max_value ?? ''}
                                                            onChange={e => setEditValues({
                                                                ...editValues,
                                                                max_value: e.target.value
                                                            })}
                                                        />
                                                    ) : (rule.max_value ?? '—')}
                                                </td>
                                                <td style={styles.td}>
                                                    {editingRule === rule.id ? (
                                                        <input
                                                            style={{ ...styles.editInput, width: '60px' }}
                                                            type="number"
                                                            value={editValues.points_awarded}
                                                            onChange={e => setEditValues({
                                                                ...editValues,
                                                                points_awarded: e.target.value
                                                            })}
                                                        />
                                                    ) : (
                                                        <span style={styles.pointsBadge}>
                                                            {rule.points_awarded} pts
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>
                                                    {editingRule === rule.id ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                style={styles.saveBtn}
                                                                onClick={() => saveRule(rule.id)}
                                                                disabled={saving === rule.id}
                                                            >
                                                                {saving === rule.id ? '...' : '✅ Save'}
                                                            </button>
                                                            <button
                                                                style={styles.cancelBtn}
                                                                onClick={() => setEditingRule(null)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            style={styles.editBtn}
                                                            onClick={() => startEdit(rule)}
                                                        >
                                                            ✏️ Edit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && stats && (
                <div>
                    <div style={styles.statsGrid}>
                        {[
                            { label: 'Total Applicants Scored', value: stats.total_scored, color: '#1a237e' },
                            { label: 'Average CSI Score', value: `${stats.average_csi}/100`, color: '#2e7d32' },
                            { label: 'Individual Scorings', value: stats.individual_count, color: '#1565c0' },
                            { label: 'Batch Sessions', value: stats.batch_count, color: '#6a1b9a' },
                        ].map(item => (
                            <div key={item.label} style={styles.statCard}>
                                <p style={styles.statLabel}>{item.label}</p>
                                <p style={{ ...styles.statValue, color: item.color }}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={styles.tierStatsBox}>
                        <h3 style={styles.tierStatsTitle}>Risk Tier Distribution</h3>
                        {Object.entries(stats.tier_summary || {}).map(([tier, count]) => (
                            <div key={tier} style={styles.tierRow}>
                                <span style={styles.tierLabel}>{tier.replace('_', ' ').toUpperCase()}</span>
                                <div style={styles.tierBarTrack}>
                                    <div style={{
                                        ...styles.tierBarFill,
                                        width: `${(count / stats.total_scored) * 100}%`,
                                        background: indicatorColors[tier] || '#1a237e',
                                    }} />
                                </div>
                                <span style={styles.tierCount}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '32px', maxWidth: '1000px', margin: '0 auto' },
    title: { fontSize: '26px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
    subtitle: { color: '#666', margin: '0 0 24px 0', fontSize: '15px' },
    tabs: { display: 'flex', gap: '12px', marginBottom: '24px' },
    tab: {
        padding: '10px 24px', background: '#fff', border: '2px solid #e0e0e0',
        borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#666',
    },
    tabActive: {
        padding: '10px 24px', background: '#1a237e', border: '2px solid #1a237e',
        borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#fff',
    },
    message: { padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' },
    infoBox: { background: '#e8eaf6', borderRadius: '8px', padding: '14px 18px', marginBottom: '24px' },
    infoText: { margin: 0, fontSize: '14px', color: '#3949ab' },
    loading: { textAlign: 'center', padding: '40px', color: '#666' },
    ruleGroup: { background: '#fff', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    ruleGroupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8f9ff' },
    ruleGroupTitle: { margin: 0, fontSize: '16px', fontWeight: '700', color: '#1a237e' },
    maxPoints: { fontSize: '13px', color: '#666', fontWeight: '600' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHead: { background: '#f5f5f5' },
    th: { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
    tableRow: { borderTop: '1px solid #f0f0f0' },
    td: { padding: '12px 16px', fontSize: '14px', color: '#333' },
    editInput: { padding: '6px 10px', border: '2px solid #1a237e', borderRadius: '6px', fontSize: '14px', width: '80px' },
    pointsBadge: { background: '#e8eaf6', color: '#1a237e', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700' },
    editBtn: { padding: '6px 14px', background: '#fff', border: '2px solid #1a237e', color: '#1a237e', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    saveBtn: { padding: '6px 14px', background: '#2e7d32', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    cancelBtn: { padding: '6px 14px', background: '#f5f5f5', border: 'none', color: '#666', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    statLabel: { margin: '0 0 8px 0', fontSize: '13px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { margin: 0, fontSize: '32px', fontWeight: '800' },
    tierStatsBox: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    tierStatsTitle: { margin: '0 0 20px 0', fontSize: '16px', fontWeight: '700', color: '#333' },
    tierRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' },
    tierLabel: { fontSize: '13px', fontWeight: '600', color: '#555', width: '120px' },
    tierBarTrack: { flex: 1, height: '10px', background: '#f0f0f0', borderRadius: '5px', overflow: 'hidden' },
    tierBarFill: { height: '100%', borderRadius: '5px', transition: 'width 0.5s' },
    tierCount: { fontSize: '14px', fontWeight: '700', color: '#333', width: '30px', textAlign: 'right' },
};
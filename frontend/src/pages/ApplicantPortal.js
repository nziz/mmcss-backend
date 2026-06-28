import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000/api';
const getToken = () => localStorage.getItem('access_token');

export default function ApplicantPortal({ user, onLogout }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('dashboard');
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [file, setFile] = useState(null);
    const [accountAge, setAccountAge] = useState(12);
    const [profileForm, setProfileForm] = useState({});
    const [profileMsg, setProfileMsg] = useState('');
    const [selectedScore, setSelectedScore] = useState(null);

    useEffect(() => {
        fetchPortalData();
    }, []);

    const fetchPortalData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/applicant/portal/`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setData(res.data);
            setProfileForm({
                first_name: user?.first_name || '',
                last_name: user?.last_name || '',
                email: user?.email || '',
                phone_number: user?.phone_number || '',
            });
        } catch (err) {
            setError('Failed to load your data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { setUploadMsg('Please select a CSV file.'); return; }
        setUploading(true);
        setUploadMsg('');
        const formData = new FormData();
        formData.append('transaction_file', file);
        formData.append('account_age_months', accountAge);
        try {
            const res = await axios.post(`${API}/applicant/upload/`, formData, {
                headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'multipart/form-data',
                }
            });
            setUploadMsg('✅ ' + res.data.message);
            fetchPortalData();
            setTab('dashboard');
        } catch (err) {
            setUploadMsg('❌ ' + (err.response?.data?.error || 'Upload failed.'));
        } finally {
            setUploading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileMsg('');
        try {
            await axios.put(`${API}/applicant/profile/`, profileForm, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setProfileMsg('✅ Profile updated successfully!');
        } catch (err) {
            setProfileMsg('❌ ' + (err.response?.data?.error || 'Update failed.'));
        }
    };

    const getTierColor = (tier) => ({
        excellent: '#1b5e20', good: '#2e7d32',
        fair: '#f57f17', poor: '#e65100', very_poor: '#b71c1c',
    }[tier] || '#666');

    const getTierBg = (tier) => ({
        excellent: '#e8f5e9', good: '#f1f8e9',
        fair: '#fff8e1', poor: '#fff3e0', very_poor: '#ffebee',
    }[tier] || '#f5f5f5');

    if (loading) return (
        <div style={styles.loadingPage}>
            <div style={styles.loadingCard}>
                <div style={styles.loadingSpinner}>⏳</div>
                <p>Loading your portal...</p>
            </div>
        </div>
    );

    const stats = data?.statistics || {};
    const scores = data?.score_history || [];
    const applicant = data?.applicant || {};

    return (
        <div style={styles.page}>
            {/* Top Bar */}
            <div style={styles.topBar}>
                <div style={styles.topLogo}>
                    <span style={styles.topLogoText}>MMCSS</span>
                    <span style={styles.topLogoSub}>Applicant Portal</span>
                </div>
                <div style={styles.topUser}>
                    <span style={styles.topUserName}>
                        {user?.first_name} {user?.last_name}
                    </span>
                    <button style={styles.logoutBtn} onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={styles.tabBar}>
                {[
                    { key: 'dashboard', label: '📊 My Dashboard' },
                    { key: 'upload', label: '📤 Request Scoring' },
                    { key: 'history', label: '📋 Score History' },
                    { key: 'profile', label: '👤 My Profile' },
                ].map(t => (
                    <button
                        key={t.key}
                        style={tab === t.key ? styles.tabActive : styles.tab}
                        onClick={() => setTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                {error && <div style={styles.error}>{error}</div>}

                {/* ── DASHBOARD TAB ── */}
                {tab === 'dashboard' && (
                    <div>
                        <h2 style={styles.pageTitle}>
                            Welcome, {user?.first_name}! 👋
                        </h2>
                        <p style={styles.pageSubtitle}>
                            Here is your credit scoring summary
                        </p>

                        {/* Stats Cards */}
                        <div style={styles.statsGrid}>
                            {[
                                { label: 'Total Scorings', value: stats.total_scorings || 0, color: '#1a237e' },
                                { label: 'Average CSI', value: stats.average_csi ? `${stats.average_csi}/100` : '—', color: '#2e7d32' },
                                { label: 'Latest Score', value: stats.latest_csi ? `${stats.latest_csi}/100` : '—', color: '#f57f17' },
                                { label: 'Latest Tier', value: stats.latest_tier?.replace('_', ' ').toUpperCase() || '—', color: getTierColor(stats.latest_tier) },
                            ].map(item => (
                                <div key={item.label} style={styles.statCard}>
                                    <p style={styles.statLabel}>{item.label}</p>
                                    <p style={{ ...styles.statValue, color: item.color }}>
                                        {item.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Latest Score Card */}
                        {scores.length > 0 && (
                            <div style={{
                                ...styles.latestCard,
                                backgroundColor: getTierBg(stats.latest_tier),
                                borderLeft: `6px solid ${getTierColor(stats.latest_tier)}`,
                            }}>
                                <h3 style={styles.latestTitle}>Your Latest Credit Score</h3>
                                <div style={styles.latestScore}>
                                    <span style={{
                                        ...styles.csiNumber,
                                        color: getTierColor(stats.latest_tier),
                                    }}>
                                        {stats.latest_csi}
                                    </span>
                                    <span style={styles.csiMax}>/100</span>
                                </div>
                                <div style={styles.latestTierBadge}>
                                    <span style={{
                                        background: getTierColor(stats.latest_tier),
                                        color: '#fff', padding: '6px 20px',
                                        borderRadius: '20px', fontSize: '14px',
                                        fontWeight: '700',
                                    }}>
                                        {stats.latest_tier?.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <p style={styles.latestRec}>
                                    Recommendation: <strong style={{ color: getTierColor(stats.latest_tier) }}>
                                        {scores[0]?.recommendation_display}
                                    </strong>
                                </p>
                                <p style={styles.latestDate}>
                                    Scored on: {new Date(scores[0]?.scored_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'long', year: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}

                        {scores.length === 0 && (
                            <div style={styles.noScoreCard}>
                                <div style={styles.noScoreIcon}>📊</div>
                                <h3>No scores yet</h3>
                                <p>Upload your mobile money transaction file to get your credit score.</p>
                                <button
                                    style={styles.uploadNowBtn}
                                    onClick={() => setTab('upload')}
                                >
                                    Upload Transactions Now →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── UPLOAD TAB ── */}
                {tab === 'upload' && (
                    <div style={styles.uploadSection}>
                        <h2 style={styles.pageTitle}>📤 Request Credit Scoring</h2>
                        <p style={styles.pageSubtitle}>
                            Upload your mobile money transaction CSV file to compute your credit score
                        </p>

                        <div style={styles.uploadCard}>
                            <div style={styles.formatBox}>
                                <h4 style={styles.formatTitle}>📋 Required CSV Format</h4>
                                <code style={styles.formatCode}>
                                    transaction_date, transaction_type, amount_rwf,
                                    counterparty_id, is_savings, is_bill_payment
                                </code>
                            </div>

                            <form onSubmit={handleUpload} style={styles.uploadForm}>
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Transaction File (CSV) *
                                    </label>
                                    <input
                                        type="file"
                                        accept=".csv,.json"
                                        onChange={e => setFile(e.target.files[0])}
                                        style={styles.fileInput}
                                    />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Account Age (months) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="240"
                                        value={accountAge}
                                        onChange={e => setAccountAge(e.target.value)}
                                        style={styles.numberInput}
                                    />
                                    <small style={styles.hint}>
                                        How many months have you been using mobile money?
                                    </small>
                                </div>
                                {uploadMsg && (
                                    <div style={{
                                        ...styles.uploadMsg,
                                        background: uploadMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                                        color: uploadMsg.startsWith('✅') ? '#2e7d32' : '#c62828',
                                    }}>
                                        {uploadMsg}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    style={styles.submitBtn}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Computing score...' : '🚀 Submit for Scoring'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── HISTORY TAB ── */}
                {tab === 'history' && (
                    <div>
                        <h2 style={styles.pageTitle}>📋 My Score History</h2>
                        <p style={styles.pageSubtitle}>
                            All your previous credit score records
                        </p>

                        {scores.length === 0 ? (
                            <div style={styles.noScoreCard}>
                                <div style={styles.noScoreIcon}>📋</div>
                                <p>No scoring history yet.</p>
                            </div>
                        ) : (
                            scores.map(score => (
                                <div
                                    key={score.id}
                                    style={{
                                        ...styles.historyCard,
                                        backgroundColor: getTierBg(score.risk_tier),
                                        borderLeft: `5px solid ${getTierColor(score.risk_tier)}`,
                                    }}
                                    onClick={() => setSelectedScore(
                                        selectedScore?.id === score.id ? null : score
                                    )}
                                >
                                    <div style={styles.historyHeader}>
                                        <div>
                                            <span style={{
                                                background: getTierColor(score.risk_tier),
                                                color: '#fff', padding: '4px 14px',
                                                borderRadius: '20px', fontSize: '12px',
                                                fontWeight: '700', marginRight: '12px',
                                            }}>
                                                {score.risk_tier_display?.toUpperCase()}
                                            </span>
                                            <span style={{ fontSize: '20px', fontWeight: '700' }}>
                                                CSI: {score.csi_total}/100
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '13px', color: '#666' }}>
                                            {new Date(score.scored_at).toLocaleDateString('en-GB')}
                                        </span>
                                    </div>

                                    <p style={{ margin: '8px 0 4px', fontSize: '14px', color: '#555' }}>
                                        Recommendation: <strong style={{ color: getTierColor(score.risk_tier) }}>
                                            {score.recommendation_display}
                                        </strong>
                                    </p>

                                    {selectedScore?.id === score.id && (
                                        <div style={styles.breakdown}>
                                            {[
                                                { label: 'Transaction Frequency', s: score.txn_frequency_score, max: 25 },
                                                { label: 'Avg Transaction Value', s: score.avg_txn_value_score, max: 20 },
                                                { label: 'Savings Consistency', s: score.savings_score, max: 20 },
                                                { label: 'Bill Payment Regularity', s: score.bill_payment_score, max: 15 },
                                                { label: 'Network Diversity', s: score.network_diversity_score, max: 10 },
                                                { label: 'Account Age', s: score.account_age_score, max: 10 },
                                            ].map(item => (
                                                <div key={item.label} style={styles.barRow}>
                                                    <span style={styles.barLabel}>{item.label}</span>
                                                    <div style={styles.barTrack}>
                                                        <div style={{
                                                            ...styles.barFill,
                                                            width: `${(item.s / item.max) * 100}%`,
                                                            background: getTierColor(score.risk_tier),
                                                        }} />
                                                    </div>
                                                    <span style={styles.barScore}>{item.s}/{item.max}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p style={{ fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
                                        {selectedScore?.id === score.id ? '▲ Collapse' : '▼ View breakdown'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── PROFILE TAB ── */}
                {tab === 'profile' && (
                    <div>
                        <h2 style={styles.pageTitle}>👤 My Profile</h2>
                        <p style={styles.pageSubtitle}>
                            Update your personal information and credentials
                        </p>

                        <div style={styles.profileCard}>
                            <form onSubmit={handleProfileUpdate}>
                                <div style={styles.row}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>First Name</label>
                                        <input
                                            style={styles.input}
                                            value={profileForm.first_name || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, first_name: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Last Name</label>
                                        <input
                                            style={styles.input}
                                            value={profileForm.last_name || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, last_name: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>
                                <div style={styles.row}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Email Address</label>
                                        <input
                                            style={styles.input}
                                            type="email"
                                            value={profileForm.email || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, email: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Phone Number</label>
                                        <input
                                            style={styles.input}
                                            value={profileForm.phone_number || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, phone_number: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>

                                <div style={styles.divider} />
                                <h4 style={styles.passwordTitle}>Change Password</h4>
                                <div style={styles.row}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Current Password</label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={profileForm.old_password || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, old_password: e.target.value
                                            })}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>New Password</label>
                                        <input
                                            style={styles.input}
                                            type="password"
                                            value={profileForm.new_password || ''}
                                            onChange={e => setProfileForm({
                                                ...profileForm, new_password: e.target.value
                                            })}
                                        />
                                    </div>
                                </div>

                                {profileMsg && (
                                    <div style={{
                                        ...styles.uploadMsg,
                                        background: profileMsg.startsWith('✅') ? '#e8f5e9' : '#ffebee',
                                        color: profileMsg.startsWith('✅') ? '#2e7d32' : '#c62828',
                                    }}>
                                        {profileMsg}
                                    </div>
                                )}

                                <button type="submit" style={styles.submitBtn}>
                                    💾 Save Changes
                                </button>
                            </form>

                            {/* Applicant Info (read only) */}
                            <div style={styles.divider} />
                            <h4 style={styles.passwordTitle}>Applicant Reference</h4>
                            <div style={styles.refBox}>
                                <p style={styles.refLabel}>Your Reference Code:</p>
                                <p style={styles.refValue}>{applicant.applicant_ref}</p>
                                <p style={styles.refHint}>
                                    Use this reference code when communicating with your MFI/SACCO
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: { minHeight: '100vh', background: '#f5f6fa', fontFamily: 'Segoe UI, sans-serif' },
    loadingPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' },
    loadingCard: { textAlign: 'center', padding: '40px' },
    loadingSpinner: { fontSize: '48px', marginBottom: '16px' },
    topBar: {
        background: '#1a237e', padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
    },
    topLogo: { display: 'flex', alignItems: 'center', gap: '12px' },
    topLogoText: { color: '#fff', fontWeight: '800', fontSize: '20px' },
    topLogoSub: { color: 'rgba(255,255,255,0.6)', fontSize: '13px' },
    topUser: { display: 'flex', alignItems: 'center', gap: '16px' },
    topUserName: { color: '#fff', fontSize: '14px', fontWeight: '600' },
    logoutBtn: {
        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff', padding: '6px 16px', borderRadius: '6px',
        cursor: 'pointer', fontSize: '13px',
    },
    tabBar: {
        background: '#fff', padding: '0 32px', borderBottom: '1px solid #e0e0e0',
        display: 'flex', gap: '4px',
    },
    tab: {
        padding: '16px 20px', background: 'none', border: 'none',
        borderBottom: '3px solid transparent', cursor: 'pointer',
        fontSize: '14px', color: '#666', fontWeight: '500',
    },
    tabActive: {
        padding: '16px 20px', background: 'none', border: 'none',
        borderBottom: '3px solid #1a237e', cursor: 'pointer',
        fontSize: '14px', color: '#1a237e', fontWeight: '700',
    },
    content: { padding: '32px', maxWidth: '900px', margin: '0 auto' },
    error: { background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' },
    pageTitle: { fontSize: '24px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
    pageSubtitle: { color: '#666', fontSize: '15px', margin: '0 0 28px 0' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' },
    statCard: { background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    statLabel: { margin: '0 0 8px 0', fontSize: '12px', color: '#999', textTransform: 'uppercase' },
    statValue: { margin: 0, fontSize: '24px', fontWeight: '800' },
    latestCard: { borderRadius: '12px', padding: '28px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    latestTitle: { margin: '0 0 16px 0', fontSize: '16px', color: '#555' },
    latestScore: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px', marginBottom: '16px' },
    csiNumber: { fontSize: '64px', fontWeight: '900', lineHeight: 1 },
    csiMax: { fontSize: '24px', color: '#999', fontWeight: '600' },
    latestTierBadge: { marginBottom: '12px' },
    latestRec: { fontSize: '15px', color: '#555', margin: '8px 0' },
    latestDate: { fontSize: '13px', color: '#999', margin: 0 },
    noScoreCard: {
        background: '#fff', borderRadius: '12px', padding: '48px',
        textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    },
    noScoreIcon: { fontSize: '48px', marginBottom: '16px' },
    uploadNowBtn: {
        marginTop: '16px', padding: '12px 28px',
        background: '#1a237e', color: '#fff', border: 'none',
        borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: '600',
    },
    uploadSection: {},
    uploadCard: { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    formatBox: { background: '#f8f9ff', borderRadius: '8px', padding: '16px', marginBottom: '24px', border: '1px solid #e8eaf6' },
    formatTitle: { margin: '0 0 8px 0', fontSize: '14px', color: '#1a237e' },
    formatCode: { fontSize: '13px', color: '#555', display: 'block', lineHeight: 1.6 },
    uploadForm: { display: 'flex', flexDirection: 'column', gap: '20px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#555' },
    fileInput: { padding: '10px', border: '2px dashed #1a237e', borderRadius: '8px', cursor: 'pointer' },
    numberInput: { padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '15px', width: '200px' },
    hint: { fontSize: '12px', color: '#999' },
    uploadMsg: { padding: '12px 16px', borderRadius: '8px', fontSize: '14px' },
    submitBtn: {
        padding: '14px', background: '#1a237e', color: '#fff',
        border: 'none', borderRadius: '10px', fontSize: '16px',
        fontWeight: '700', cursor: 'pointer',
    },
    historyCard: { borderRadius: '10px', padding: '18px', marginBottom: '14px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
    historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    breakdown: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.08)' },
    barRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
    barLabel: { fontSize: '13px', color: '#555', width: '180px', flexShrink: 0 },
    barTrack: { flex: 1, height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: '4px' },
    barScore: { fontSize: '13px', fontWeight: '600', color: '#333', width: '40px', textAlign: 'right' },
    profileCard: { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    input: { padding: '10px 14px', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '14px', fontFamily: 'Segoe UI, sans-serif' },
    divider: { height: '1px', background: '#e0e0e0', margin: '24px 0' },
    passwordTitle: { fontSize: '15px', fontWeight: '700', color: '#333', margin: '0 0 16px 0' },
    refBox: { background: '#f8f9ff', borderRadius: '8px', padding: '16px', border: '1px solid #e8eaf6' },
    refLabel: { fontSize: '12px', color: '#999', margin: '0 0 4px 0', textTransform: 'uppercase' },
    refValue: { fontSize: '20px', fontWeight: '800', color: '#1a237e', margin: '0 0 8px 0' },
    refHint: { fontSize: '13px', color: '#666', margin: 0 },
};
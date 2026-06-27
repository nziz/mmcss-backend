import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000/api';

const getToken = () => localStorage.getItem('access_token');

export default function ApplicantHistory() {
    const [searchRef, setSearchRef] = useState('');
    const [applicant, setApplicant] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedScore, setSelectedScore] = useState(null);

    const searchApplicant = async () => {
        if (!searchRef.trim()) {
            setError('Please enter an applicant reference code.');
            return;
        }
        setLoading(true);
        setError('');
        setApplicant(null);
        setHistory([]);

        try {
            const res = await axios.get(
                `${API}/applicants/${searchRef.trim()}/`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            setApplicant(res.data.applicant);
            setHistory(res.data.score_history);
        } catch (err) {
            setError(err.response?.data?.error || 'Applicant not found.');
        } finally {
            setLoading(false);
        }
    };

    const getTierColor = (tier) => {
        const colors = {
            excellent: '#1b5e20',
            good: '#2e7d32',
            fair: '#f57f17',
            poor: '#e65100',
            very_poor: '#b71c1c',
        };
        return colors[tier] || '#666';
    };

    const getTierBg = (tier) => {
        const colors = {
            excellent: '#e8f5e9',
            good: '#f1f8e9',
            fair: '#fff8e1',
            poor: '#fff3e0',
            very_poor: '#ffebee',
        };
        return colors[tier] || '#f5f5f5';
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>📋 Applicant History</h2>
            <p style={styles.subtitle}>Search for an applicant's complete scoring history</p>

            {/* Search Bar */}
            <div style={styles.searchBox}>
                <input
                    style={styles.searchInput}
                    placeholder="Enter applicant reference code (e.g. APP001)"
                    value={searchRef}
                    onChange={e => setSearchRef(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchApplicant()}
                />
                <button
                    style={styles.searchBtn}
                    onClick={searchApplicant}
                    disabled={loading}
                >
                    {loading ? 'Searching...' : '🔍 Search'}
                </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {/* Applicant Profile Card */}
            {applicant && (
                <div style={styles.profileCard}>
                    <div style={styles.profileHeader}>
                        <div style={styles.avatar}>
                            {applicant.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 style={styles.profileName}>{applicant.full_name}</h3>
                            <p style={styles.profileRef}>Ref: {applicant.applicant_ref}</p>
                        </div>
                    </div>
                    <div style={styles.profileDetails}>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Phone</span>
                            <span style={styles.detailValue}>{applicant.phone_number || '—'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Gender</span>
                            <span style={styles.detailValue}>{applicant.gender || '—'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>District</span>
                            <span style={styles.detailValue}>{applicant.district || '—'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Mobile Operator</span>
                            <span style={styles.detailValue}>{applicant.mobile_operator?.toUpperCase() || '—'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Institution</span>
                            <span style={styles.detailValue}>{applicant.institution_name || '—'}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Total Scorings</span>
                            <span style={styles.detailValue}>{history.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Score History Timeline */}
            {history.length > 0 && (
                <div style={styles.historySection}>
                    <h3 style={styles.historyTitle}>
                        Scoring History ({history.length} record{history.length > 1 ? 's' : ''})
                    </h3>
                    {history.map((score, index) => (
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
                            <div style={styles.historyCardHeader}>
                                <div>
                                    <span style={{
                                        ...styles.tierBadge,
                                        backgroundColor: getTierColor(score.risk_tier),
                                    }}>
                                        {score.risk_tier_display?.toUpperCase()}
                                    </span>
                                    <span style={styles.csiScore}>CSI: {score.csi_total}/100</span>
                                </div>
                                <div style={styles.historyMeta}>
                                    <span style={styles.historyDate}>
                                        {new Date(score.scored_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </span>
                                    <span style={styles.historyMode}>
                                        {score.scoring_mode === 'individual' ? '👤' : '👥'} {score.scoring_mode}
                                    </span>
                                </div>
                            </div>

                            <div style={styles.recRow}>
                                <span style={styles.recLabel}>Recommendation:</span>
                                <span style={{
                                    ...styles.recValue,
                                    color: getTierColor(score.risk_tier)
                                }}>
                                    {score.recommendation_display}
                                </span>
                            </div>

                            {/* Expanded Score Breakdown */}
                            {selectedScore?.id === score.id && (
                                <div style={styles.breakdown}>
                                    <h4 style={styles.breakdownTitle}>Score Breakdown</h4>
                                    {[
                                        { label: 'Transaction Frequency', score: score.txn_frequency_score, max: 25 },
                                        { label: 'Avg Transaction Value', score: score.avg_txn_value_score, max: 20 },
                                        { label: 'Savings Consistency', score: score.savings_score, max: 20 },
                                        { label: 'Bill Payment Regularity', score: score.bill_payment_score, max: 15 },
                                        { label: 'Network Diversity', score: score.network_diversity_score, max: 10 },
                                        { label: 'Account Age', score: score.account_age_score, max: 10 },
                                    ].map(item => (
                                        <div key={item.label} style={styles.barRow}>
                                            <span style={styles.barLabel}>{item.label}</span>
                                            <div style={styles.barTrack}>
                                                <div style={{
                                                    ...styles.barFill,
                                                    width: `${(item.score / item.max) * 100}%`,
                                                    backgroundColor: getTierColor(score.risk_tier),
                                                }} />
                                            </div>
                                            <span style={styles.barScore}>
                                                {item.score}/{item.max}
                                            </span>
                                        </div>
                                    ))}
                                    <p style={styles.scoredBy}>
                                        Scored by: {score.scored_by_name} •
                                        {score.observation_months} months data
                                    </p>
                                </div>
                            )}

                            <p style={styles.clickHint}>
                                {selectedScore?.id === score.id ? '▲ Click to collapse' : '▼ Click to expand breakdown'}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {applicant && history.length === 0 && (
                <div style={styles.noHistory}>
                    No scoring history found for this applicant.
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '32px', maxWidth: '900px', margin: '0 auto' },
    title: { fontSize: '26px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
    subtitle: { color: '#666', margin: '0 0 28px 0', fontSize: '15px' },
    searchBox: { display: 'flex', gap: '12px', marginBottom: '24px' },
    searchInput: {
        flex: 1, padding: '12px 16px', fontSize: '15px',
        border: '2px solid #e0e0e0', borderRadius: '8px',
        outline: 'none', fontFamily: 'Segoe UI, sans-serif',
    },
    searchBtn: {
        padding: '12px 24px', background: '#1a237e', color: '#fff',
        border: 'none', borderRadius: '8px', fontSize: '15px',
        cursor: 'pointer', fontWeight: '600',
    },
    error: {
        background: '#ffebee', color: '#c62828', padding: '12px 16px',
        borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
    },
    profileCard: {
        background: '#fff', borderRadius: '12px', padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '28px',
    },
    profileHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
    avatar: {
        width: '56px', height: '56px', borderRadius: '50%',
        background: '#1a237e', color: '#fff', fontSize: '24px',
        fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    profileName: { margin: '0 0 4px 0', fontSize: '20px', fontWeight: '700', color: '#1a237e' },
    profileRef: { margin: 0, color: '#666', fontSize: '14px' },
    profileDetails: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
    detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
    detailLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' },
    detailValue: { fontSize: '14px', color: '#333', fontWeight: '600' },
    historySection: { marginTop: '8px' },
    historyTitle: { fontSize: '18px', fontWeight: '700', color: '#333', marginBottom: '16px' },
    historyCard: {
        borderRadius: '10px', padding: '18px', marginBottom: '14px',
        cursor: 'pointer', transition: 'box-shadow 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    historyCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    tierBadge: {
        color: '#fff', padding: '4px 12px', borderRadius: '20px',
        fontSize: '12px', fontWeight: '700', marginRight: '12px',
    },
    csiScore: { fontSize: '18px', fontWeight: '700', color: '#333' },
    historyMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
    historyDate: { fontSize: '13px', color: '#666' },
    historyMode: { fontSize: '12px', color: '#999' },
    recRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' },
    recLabel: { fontSize: '13px', color: '#666' },
    recValue: { fontSize: '14px', fontWeight: '700' },
    breakdown: {
        marginTop: '16px', paddingTop: '16px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
    },
    breakdownTitle: { fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '12px' },
    barRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
    barLabel: { fontSize: '13px', color: '#555', width: '180px', flexShrink: 0 },
    barTrack: { flex: 1, height: '8px', background: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s' },
    barScore: { fontSize: '13px', fontWeight: '600', color: '#333', width: '40px', textAlign: 'right' },
    scoredBy: { fontSize: '12px', color: '#999', marginTop: '12px' },
    clickHint: { fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' },
    noHistory: {
        background: '#fff', borderRadius: '10px', padding: '32px',
        textAlign: 'center', color: '#666', fontSize: '15px',
    },
};
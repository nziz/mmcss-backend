import React, { useState } from 'react';
import { scoreBatch } from '../services/api';

const TIER_COLORS = {
    excellent: '#2e7d32',
    good: '#558b2f',
    fair: '#f9a825',
    poor: '#e65100',
    very_poor: '#b71c1c',
};

export default function ScoreBatch() {
    const [file, setFile] = useState(null);
    const [notes, setNotes] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) { setError('Please select a batch transaction file.'); return; }
        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('transaction_file', file);
        formData.append('notes', notes);
        formData.append('account_ages', '{}');

        try {
            const res = await scoreBatch(formData);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Batch scoring failed. Check your file format.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Batch / Group Scoring</h2>

            {/* Instructions */}
            <div style={styles.infoBox}>
                <h4 style={styles.infoTitle}>📋 Batch File Format</h4>
                <p style={styles.infoText}>
                    Upload a CSV file containing transactions for multiple applicants.
                    The file must include these columns:
                </p>
                <code style={styles.code}>
                    applicant_ref, transaction_date, transaction_type, amount_rwf,
                    counterparty_id, is_savings, is_bill_payment
                </code>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.field}>
                    <label style={styles.label}>Batch Transaction File (CSV) *</label>
                    <input
                        style={styles.input}
                        type="file"
                        accept=".csv,.json"
                        onChange={e => setFile(e.target.files[0])}
                        required
                    />
                </div>

                <div style={styles.field}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                        style={styles.textarea}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optional notes about this batch session..."
                        rows={3}
                    />
                </div>

                <button
                    style={loading ? styles.buttonDisabled : styles.button}
                    type="submit"
                    disabled={loading}
                >
                    {loading ? 'Processing Batch...' : 'Run Batch Scoring'}
                </button>
            </form>

            {/* Results */}
            {result && (
                <div style={styles.resultBox}>
                    <h3 style={styles.resultTitle}>Batch Results</h3>

                    {/* Summary */}
                    <div style={styles.summaryCards}>
                        <div style={styles.summaryCard}>
                            <p style={styles.summaryLabel}>Total Applicants</p>
                            <p style={styles.summaryValue}>{result.summary.total}</p>
                        </div>
                        <div style={styles.summaryCard}>
                            <p style={styles.summaryLabel}>Processed</p>
                            <p style={{ ...styles.summaryValue, color: '#2e7d32' }}>
                                {result.summary.processed}
                            </p>
                        </div>
                        <div style={styles.summaryCard}>
                            <p style={styles.summaryLabel}>Failed</p>
                            <p style={{ ...styles.summaryValue, color: '#b71c1c' }}>
                                {result.summary.failed}
                            </p>
                        </div>
                        <div style={styles.summaryCard}>
                            <p style={styles.summaryLabel}>Session Ref</p>
                            <p style={{ ...styles.summaryValue, fontSize: '14px' }}>
                                {result.batch_session.session_ref}
                            </p>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Ref</th>
                                    <th style={styles.th}>CSI</th>
                                    <th style={styles.th}>Risk Tier</th>
                                    <th style={styles.th}>Recommendation</th>
                                    <th style={styles.th}>Txn Freq</th>
                                    <th style={styles.th}>Avg Value</th>
                                    <th style={styles.th}>Savings</th>
                                    <th style={styles.th}>Bills</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.results.map(s => (
                                    <tr key={s.id} style={styles.tr}>
                                        <td style={styles.td}>{s.applicant_ref}</td>
                                        <td style={{ ...styles.td, fontWeight: '700', color: '#1a237e' }}>
                                            {s.csi_total}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                background: TIER_COLORS[s.risk_tier] || '#888'
                                            }}>
                                                {s.risk_tier_display}
                                            </span>
                                        </td>
                                        <td style={styles.td}>{s.recommendation_display}</td>
                                        <td style={styles.td}>{s.txn_frequency_score} pts</td>
                                        <td style={styles.td}>{s.avg_txn_value_score} pts</td>
                                        <td style={styles.td}>{s.savings_score} pts</td>
                                        <td style={styles.td}>{s.bill_payment_score} pts</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '24px' },
    heading: { fontSize: '22px', fontWeight: '700', color: '#1a237e', marginBottom: '24px' },
    infoBox: { background: '#e8eaf6', borderRadius: '10px', padding: '20px', marginBottom: '24px' },
    infoTitle: { fontSize: '15px', fontWeight: '700', color: '#1a237e', margin: '0 0 8px 0' },
    infoText: { fontSize: '13px', color: '#333', margin: '0 0 8px 0' },
    code: { display: 'block', background: '#fff', padding: '10px', borderRadius: '6px', fontSize: '12px', color: '#333' },
    form: { background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
    textarea: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'vertical' },
    button: { padding: '14px 32px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    buttonDisabled: { padding: '14px 32px', background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'not-allowed' },
    error: { background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' },
    resultBox: { background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
    resultTitle: { fontSize: '18px', fontWeight: '700', color: '#1a237e', marginBottom: '16px' },
    summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    summaryCard: { background: '#f5f5f5', borderRadius: '10px', padding: '16px', textAlign: 'center' },
    summaryLabel: { fontSize: '12px', color: '#888', margin: '0 0 8px 0' },
    summaryValue: { fontSize: '24px', fontWeight: '800', color: '#1a237e', margin: '0' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { background: '#1a237e' },
    th: { padding: '14px 16px', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'left' },
    tr: { borderBottom: '1px solid #f0f0f0' },
    td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
    badge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
};
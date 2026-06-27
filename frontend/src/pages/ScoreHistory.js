import React, { useState, useEffect } from 'react';
import { getScores, getScoreDetail } from '../services/api';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

const TIER_COLORS = {
    excellent: '#2e7d32', good: '#558b2f',
    fair: '#f9a825', poor: '#e65100', very_poor: '#b71c1c',
};

const TIER_EXPLANATIONS = {
    excellent: 'Outstanding mobile money behaviour. Consistent high-frequency transactions, strong savings culture, and reliable bill payments indicate very low credit risk.',
    good: 'Good financial behaviour with regular mobile money activity and acceptable savings patterns. Minor areas for improvement exist but overall risk is manageable.',
    fair: 'Moderate mobile money activity. Some inconsistencies in savings or bill payments were noted. A closer review is recommended before approving credit.',
    poor: 'Weak mobile money behaviour with irregular transactions and limited savings. Credit approval is not recommended without additional collateral.',
    very_poor: 'Very poor mobile money behaviour. Extremely low transaction activity and no savings history indicate very high credit risk.',
};

const INDICATOR_INFO = {
    txn_frequency_score:     { label: 'Transaction Frequency', max: 25 },
    avg_txn_value_score:     { label: 'Avg Transaction Value', max: 20 },
    savings_score:           { label: 'Savings Consistency',   max: 20 },
    bill_payment_score:      { label: 'Bill Payment Regularity', max: 15 },
    network_diversity_score: { label: 'Network Diversity',     max: 10 },
    account_age_score:       { label: 'Account Age',           max: 10 },
};

const INDICATOR_LIST = [
    { key: 'txn_frequency_score',     label: 'Transaction Frequency',   max: 25 },
    { key: 'avg_txn_value_score',     label: 'Avg Transaction Value',   max: 20 },
    { key: 'savings_score',           label: 'Savings Consistency',     max: 20 },
    { key: 'bill_payment_score',      label: 'Bill Payment Regularity', max: 15 },
    { key: 'network_diversity_score', label: 'Network Diversity',       max: 10 },
    { key: 'account_age_score',       label: 'Account Age',             max: 10 },
];

export default function ScoreHistory() {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('');
    const [sortField, setSortField] = useState('scored_at');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedScore, setSelectedScore] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editNotes, setEditNotes] = useState('');

    const fetchScores = () => {
        setLoading(true);
        getScores({ search, risk_tier: tierFilter, mode: modeFilter })
            .then(res => setScores(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchScores(); }, []);

    // ── Sorting ───────────────────────────────────────────────────────────────
    const sorted = [...scores].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (sortField === 'scored_at') { aVal = new Date(aVal); bVal = new Date(bVal); }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (field) => {
        if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    // ── Open Detail ───────────────────────────────────────────────────────────
    const openDetail = async (id) => {
        try {
            const res = await getScoreDetail(id);
            setSelectedScore(res.data);
            setEditNotes(res.data.notes || '');
            setEditMode(false);
            setShowModal(true);
        } catch (err) { console.error(err); }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('access_token');
            await fetch(`http://127.0.0.1:8000/api/scores/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            setScores(scores.filter(s => s.id !== id));
            setDeleteConfirm(null);
            setShowModal(false);
        } catch (err) { alert('Delete failed. You may not have permission.'); }
    };

    // ── Update Notes ──────────────────────────────────────────────────────────
    const handleUpdateNotes = async () => {
        try {
            const token = localStorage.getItem('access_token');
            await fetch(`http://127.0.0.1:8000/api/scores/${selectedScore.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: editNotes }),
            });
            setSelectedScore({ ...selectedScore, notes: editNotes });
            setScores(scores.map(s => s.id === selectedScore.id ? { ...s, notes: editNotes } : s));
            setEditMode(false);
            alert('Notes updated successfully!');
        } catch (err) { alert('Update failed.'); }
    };

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const generatePDF = (s) => {
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        let y = 20;

        doc.setFillColor(26, 35, 126);
        doc.rect(0, 0, pw, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16); doc.setFont('helvetica', 'bold');
        doc.text('MMCSS — Credit Score Report', pw / 2, 16, { align: 'center' });
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text('Mobile Money Credit Scoring System | University of Kigali', pw / 2, 25, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 33, { align: 'center' });
        y = 50;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Applicant Information', 14, y); y += 8;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${s.applicant_name}`, 14, y); y += 6;
        doc.text(`Reference: ${s.applicant_ref}`, 14, y); y += 6;
        doc.text(`Scored By: ${s.scored_by_name}`, 14, y); y += 6;
        doc.text(`Mode: ${s.scoring_mode}`, 14, y); y += 6;
        doc.text(`Date: ${new Date(s.scored_at).toLocaleDateString()}`, 14, y); y += 12;

        const colorMap = {
            excellent: [46,125,50], good: [85,139,47],
            fair: [249,168,37], poor: [230,81,0], very_poor: [183,28,28],
        };
        const [r, g, b] = colorMap[s.risk_tier] || [100, 100, 100];
        doc.setFillColor(r, g, b);
        doc.rect(14, y, pw - 28, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13); doc.setFont('helvetica', 'bold');
        doc.text(`${s.risk_tier_display.toUpperCase()} — CSI: ${s.csi_total} / 100`, pw / 2, y + 10, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Recommendation: ${s.recommendation_display}`, pw / 2, y + 18, { align: 'center' });
        y += 30;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Overall Assessment', 14, y); y += 7;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        const expText = doc.splitTextToSize(TIER_EXPLANATIONS[s.risk_tier] || '', pw - 28);
        doc.text(expText, 14, y); y += expText.length * 6 + 8;

        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('Score Breakdown', 14, y); y += 8;

        INDICATOR_LIST.forEach(ind => {
            if (y > 255) { doc.addPage(); y = 20; }
            doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.setTextColor(26, 35, 126);
            doc.text(`${ind.label}: ${s[ind.key]} / ${ind.max} pts`, 14, y); y += 5;
            doc.setFillColor(220, 220, 220);
            doc.rect(14, y, pw - 28, 4, 'F');
            doc.setFillColor(r, g, b);
            doc.rect(14, y, ((s[ind.key] / ind.max) * (pw - 28)), 4, 'F');
            y += 10;
        });

        if (s.notes) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text('Notes', 14, y); y += 7;
            doc.setFontSize(10); doc.setFont('helvetica', 'normal');
            const noteLines = doc.splitTextToSize(s.notes, pw - 28);
            doc.text(noteLines, 14, y); y += noteLines.length * 6;
        }

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9); doc.setFont('helvetica', 'italic');
        doc.text('Researcher: Nziza Aime Octave | UOK BBIT 2026 | Confidential', 14, 285);

        doc.save(`MMCSS_Report_${s.applicant_ref}_${Date.now()}.pdf`);
    };

    // ── Generate Word ─────────────────────────────────────────────────────────
    const generateWord = async (s) => {
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: 'MMCSS — Credit Score Report', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
                    new Paragraph({ text: 'Applicant Information', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ children: [new TextRun({ text: `Name: ${s.applicant_name}`, bold: true })] }),
                    new Paragraph({ children: [new TextRun(`Reference: ${s.applicant_ref}`)] }),
                    new Paragraph({ children: [new TextRun(`Scored By: ${s.scored_by_name}`)] }),
                    new Paragraph({ children: [new TextRun(`Mode: ${s.scoring_mode}`)] }),
                    new Paragraph({ children: [new TextRun(`Date: ${new Date(s.scored_at).toLocaleDateString()}`)], spacing: { after: 200 } }),
                    new Paragraph({ text: 'Credit Score Result', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ children: [new TextRun({ text: `${s.risk_tier_display.toUpperCase()} — CSI: ${s.csi_total} / 100`, bold: true, size: 28 })] }),
                    new Paragraph({ children: [new TextRun({ text: `Recommendation: ${s.recommendation_display}`, bold: true })], spacing: { after: 200 } }),
                    new Paragraph({ text: 'Overall Assessment', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ children: [new TextRun(TIER_EXPLANATIONS[s.risk_tier] || '')], spacing: { after: 200 } }),
                    new Paragraph({ text: 'Score Breakdown', heading: HeadingLevel.HEADING_2 }),
                    ...INDICATOR_LIST.map(ind =>
                        new Paragraph({ children: [new TextRun({ text: `${ind.label}: ${s[ind.key]} / ${ind.max} pts`, bold: true })] })
                    ),
                    ...(s.notes ? [
                        new Paragraph({ text: 'Notes', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }),
                        new Paragraph({ children: [new TextRun(s.notes)] }),
                    ] : []),
                    new Paragraph({ spacing: { before: 400 } }),
                    new Paragraph({ children: [new TextRun({ text: 'Researcher: Nziza Aime Octave | UOK BBIT 2026 | Confidential', italics: true, size: 18 })] }),
                ],
            }],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `MMCSS_Report_${s.applicant_ref}_${Date.now()}.docx`);
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span style={{ color: 'rgba(255,255,255,0.4)' }}> ↕</span>;
        return <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Score History</h2>

            {/* Filters */}
            <div style={styles.filters}>
                <input style={styles.search} placeholder="Search by name or reference..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select style={styles.select} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                    <option value="">All Tiers</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="very_poor">Very Poor</option>
                </select>
                <select style={styles.select} value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
                    <option value="">All Modes</option>
                    <option value="individual">Individual</option>
                    <option value="batch">Batch</option>
                </select>
                <button style={styles.button} onClick={fetchScores}>Search</button>
                <button style={styles.resetBtn} onClick={() => {
                    setSearch(''); setTierFilter(''); setModeFilter('');
                    setTimeout(fetchScores, 100);
                }}>Reset</button>
            </div>

            {/* Stats Bar */}
            {!loading && scores.length > 0 && (
                <div style={styles.statsBar}>
                    <span>Total: <strong>{scores.length}</strong></span>
                    {['excellent','good','fair','poor','very_poor'].map(t => {
                        const count = scores.filter(s => s.risk_tier === t).length;
                        if (!count) return null;
                        return (
                            <span key={t} style={{ ...styles.statBadge, background: TIER_COLORS[t] }}>
                                {t.replace('_',' ')}: {count}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={styles.loading}>Loading...</div>
            ) : sorted.length === 0 ? (
                <div style={styles.empty}>No records found.</div>
            ) : (
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.thead}>
                                {[
                                    { label: 'Ref', field: 'applicant_ref' },
                                    { label: 'Name', field: 'applicant_name' },
                                    { label: 'CSI', field: 'csi_total' },
                                    { label: 'Risk Tier', field: 'risk_tier' },
                                    { label: 'Recommendation', field: 'recommendation' },
                                    { label: 'Mode', field: 'scoring_mode' },
                                    { label: 'Date', field: 'scored_at' },
                                    { label: 'Actions', field: null },
                                ].map(col => (
                                    <th key={col.label} style={styles.th}
                                        onClick={() => col.field && handleSort(col.field)}>
                                        {col.label}
                                        {col.field && <SortIcon field={col.field} />}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(s => (
                                <tr key={s.id} style={styles.tr}>
                                    <td style={styles.td}>{s.applicant_ref}</td>
                                    <td style={styles.td}>{s.applicant_name}</td>
                                    <td style={{ ...styles.td, fontWeight: '700', color: '#1a237e' }}>{s.csi_total}</td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.badge, background: TIER_COLORS[s.risk_tier] || '#888' }}>
                                            {s.risk_tier_display}
                                        </span>
                                    </td>
                                    <td style={styles.td}>{s.recommendation_display}</td>
                                    <td style={styles.td}>{s.scoring_mode}</td>
                                    <td style={styles.td}>{new Date(s.scored_at).toLocaleDateString()}</td>
                                    <td style={styles.td}>
                                        <button style={styles.viewBtn} onClick={() => openDetail(s.id)}>👁 View</button>
                                        <button style={styles.deleteBtn} onClick={() => setDeleteConfirm(s.id)}>🗑</button>
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
                            Are you sure you want to delete this record? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button style={styles.confirmDeleteBtn} onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</button>
                            <button style={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {showModal && selectedScore && (
                <div style={styles.overlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>

                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Score Record Detail</h3>
                            <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div style={styles.infoGrid}>
                            {[
                                { label: 'Applicant', value: selectedScore.applicant_name },
                                { label: 'Reference', value: selectedScore.applicant_ref },
                                { label: 'Scored By', value: selectedScore.scored_by_name },
                                { label: 'Date', value: new Date(selectedScore.scored_at).toLocaleString() },
                                { label: 'Mode', value: selectedScore.scoring_mode },
                                { label: 'Observation', value: `${selectedScore.observation_months} months` },
                            ].map(item => (
                                <div key={item.label} style={styles.infoItem}>
                                    <span style={styles.infoLabel}>{item.label}</span>
                                    <span style={styles.infoValue}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ ...styles.tierBadge, background: TIER_COLORS[selectedScore.risk_tier] || '#888' }}>
                            {selectedScore.risk_tier_display} — CSI: {selectedScore.csi_total} / 100
                        </div>

                        <div style={styles.recBox}>
                            <span style={styles.recLabel}>Recommendation:</span>
                            <span style={styles.recValue}>{selectedScore.recommendation_display}</span>
                        </div>

                        <div style={styles.explanationBox}>
                            <p style={styles.explanationTitle}>📋 Overall Assessment</p>
                            <p style={styles.explanationText}>{TIER_EXPLANATIONS[selectedScore.risk_tier]}</p>
                        </div>

                        <p style={styles.breakdownTitle}>📊 Score Breakdown</p>
                        <div style={styles.scoreGrid}>
                            {INDICATOR_LIST.map(ind => (
                                <div key={ind.key} style={styles.scoreItem}>
                                    <div style={styles.scoreTop}>
                                        <span style={styles.scoreLabel}>{ind.label}</span>
                                        <span style={styles.scoreVal}>{selectedScore[ind.key]}/{ind.max}</span>
                                    </div>
                                    <div style={styles.barBg}>
                                        <div style={{
                                            ...styles.barFill,
                                            width: `${(selectedScore[ind.key] / ind.max) * 100}%`,
                                            background: TIER_COLORS[selectedScore.risk_tier] || '#1a237e',
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={styles.notesSection}>
                            <div style={styles.notesHeader}>
                                <p style={styles.breakdownTitle}>📝 Notes</p>
                                <button style={styles.editBtn} onClick={() => setEditMode(!editMode)}>
                                    {editMode ? 'Cancel' : '✏️ Edit'}
                                </button>
                            </div>
                            {editMode ? (
                                <div>
                                    <textarea style={styles.notesInput} value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)} rows={3} />
                                    <button style={styles.saveBtn} onClick={handleUpdateNotes}>Save Notes</button>
                                </div>
                            ) : (
                                <p style={styles.notesText}>{selectedScore.notes || 'No notes added.'}</p>
                            )}
                        </div>

                        <div style={styles.downloadRow}>
                            <button style={styles.pdfBtn} onClick={() => generatePDF(selectedScore)}>
                                📄 PDF Report
                            </button>
                            <button style={styles.wordBtn} onClick={() => generateWord(selectedScore)}>
                                📝 Word Report
                            </button>
                        </div>

                        <div style={styles.actionRow}>
                            <button style={styles.confirmDeleteBtn} onClick={() => {
                                setShowModal(false);
                                setDeleteConfirm(selectedScore.id);
                            }}>🗑 Delete Record</button>
                            <button style={styles.closeButton} onClick={() => setShowModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { padding: '24px' },
    heading: { fontSize: '22px', fontWeight: '700', color: '#1a237e', marginBottom: '24px' },
    filters: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
    search: { flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
    select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' },
    button: { padding: '10px 24px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    resetBtn: { padding: '10px 24px', background: '#757575', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    statsBar: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', fontSize: '13px' },
    statBadge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    loading: { textAlign: 'center', padding: '40px', color: '#888' },
    empty: { textAlign: 'center', padding: '40px', color: '#888' },
    tableWrapper: { background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { background: '#1a237e' },
    th: { padding: '14px 16px', color: '#fff', fontSize: '13px', fontWeight: '600', textAlign: 'left', cursor: 'pointer', userSelect: 'none' },
    tr: { borderBottom: '1px solid #f0f0f0' },
    td: { padding: '12px 16px', fontSize: '13px', color: '#333' },
    badge: { color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
    viewBtn: { padding: '5px 10px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' },
    deleteBtn: { padding: '5px 10px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    confirmBox: { background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modal: { background: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1a237e', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' },
    infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
    infoItem: { background: '#f5f6fa', borderRadius: '8px', padding: '10px' },
    infoLabel: { display: 'block', fontSize: '11px', color: '#888', marginBottom: '4px' },
    infoValue: { fontSize: '13px', fontWeight: '600', color: '#333' },
    tierBadge: { color: '#fff', padding: '14px', borderRadius: '10px', fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase' },
    recBox: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', alignItems: 'center' },
    recLabel: { fontSize: '14px', color: '#555' },
    recValue: { fontSize: '15px', fontWeight: '700', color: '#1a237e' },
    explanationBox: { background: '#e8eaf6', borderRadius: '10px', padding: '14px', marginBottom: '16px' },
    explanationTitle: { fontSize: '13px', fontWeight: '700', color: '#1a237e', margin: '0 0 6px 0' },
    explanationText: { fontSize: '12px', color: '#333', margin: 0, lineHeight: '1.6' },
    breakdownTitle: { fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '10px', marginTop: '0' },
    scoreGrid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    scoreItem: { background: '#f9f9f9', borderRadius: '8px', padding: '10px' },
    scoreTop: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
    scoreLabel: { fontSize: '12px', fontWeight: '600', color: '#333' },
    scoreVal: { fontSize: '12px', fontWeight: '700', color: '#1a237e' },
    barBg: { background: '#e0e0e0', borderRadius: '4px', height: '5px' },
    barFill: { height: '5px', borderRadius: '4px' },
    notesSection: { marginBottom: '16px' },
    notesHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    editBtn: { padding: '5px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    notesText: { fontSize: '13px', color: '#555', background: '#f9f9f9', padding: '10px', borderRadius: '8px', margin: 0 },
    notesInput: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' },
    saveBtn: { marginTop: '8px', padding: '8px 20px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
    downloadRow: { display: 'flex', gap: '12px', marginBottom: '12px' },
    pdfBtn: { flex: 1, padding: '10px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    wordBtn: { flex: 1, padding: '10px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
    actionRow: { display: 'flex', gap: '12px' },
    confirmDeleteBtn: { flex: 1, padding: '12px', background: '#b71c1c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    cancelBtn: { flex: 1, padding: '12px', background: '#757575', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    closeButton: { flex: 1, padding: '12px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};
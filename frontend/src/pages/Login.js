import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await login(username, password);
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            onLogin();
        } catch (err) {
            setError('Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>MMCSS</h1>
                    <p style={styles.subtitle}>Mobile Money Credit Scoring System</p>
                    <p style={styles.university}>University of Kigali — BBIT 2026</p>
                </div>
                <form onSubmit={handleSubmit} style={styles.form}>
                    {error && <div style={styles.error}>{error}</div>}
                    <div style={styles.field}>
                        <label style={styles.label}>Username</label>
                        <input style={styles.input} type="text" value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Enter username" required />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Password</label>
                        <input style={styles.input} type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter password" required />
                    </div>
                    <button style={loading ? styles.buttonDisabled : styles.button}
                        type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    card: { background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '36px', fontWeight: '800', color: '#1a237e', margin: '0 0 8px 0' },
    subtitle: { fontSize: '14px', color: '#555', margin: '0 0 4px 0' },
    university: { fontSize: '12px', color: '#888', margin: '0' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    field: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#333' },
    input: { padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' },
    button: { padding: '14px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    buttonDisabled: { padding: '14px', background: '#9e9e9e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'not-allowed' },
    error: { background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' },
};
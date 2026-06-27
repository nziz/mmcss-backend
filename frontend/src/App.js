import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScoreIndividual from './pages/ScoreIndividual';
import ScoreHistory from './pages/ScoreHistory';
import ScoreBatch from './pages/ScoreBatch';
import ApplicantHistory from './pages/ApplicantHistory';
import AdminPanel from './pages/AdminPanel';
import { getProfile } from './services/api';

export default function App() {
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('access_token'));
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('dashboard');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (loggedIn) {
            getProfile()
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('access_token');
                    setLoggedIn(false);
                });
        }
    }, [loggedIn]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setLoggedIn(false);
        setUser(null);
        setPage('dashboard');
    };

    if (!loggedIn) return <Login onLogin={() => setLoggedIn(true)} />;

    const navItems = [
        { key: 'dashboard',  label: '📊 Dashboard' },
        { key: 'score',      label: '👤 Score Individual' },
        { key: 'batch',      label: '👥 Batch Scoring' },
        { key: 'history',    label: '📋 Score History' },
        { key: 'applicant',  label: '🔍 Applicant History' },
        ...(user?.role === 'admin' ? [{ key: 'admin', label: '⚙️ Admin Panel' }] : []),
    ];

    return (
        <div style={styles.app}>

            {/* ── MOBILE TOP BAR ── */}
            <div style={styles.mobileTopBar}>
                <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? '✕' : '☰'}
                </button>
                <span style={styles.mobileTitle}>MMCSS</span>
                <button style={styles.mobileLogout} onClick={handleLogout}>Logout</button>
            </div>

            {/* ── SIDEBAR ── */}
            <div style={{
                ...styles.sidebar,
                transform: menuOpen ? 'translateX(0)' : undefined,
            }}>
                <div style={styles.logo}>
                    <h2 style={styles.logoText}>MMCSS</h2>
                    <p style={styles.logoSub}>Mobile Money Credit Scoring</p>
                </div>

                <nav style={styles.nav}>
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            style={page === item.key ? styles.navActive : styles.navItem}
                            onClick={() => {
                                setPage(item.key);
                                setMenuOpen(false);
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div style={styles.userBox}>
                    <div style={styles.userAvatar}>
                        {user?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <p style={styles.userName}>
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p style={styles.userRole}>{user?.role?.replace('_', ' ')}</p>
                        {user?.institution_name && (
                            <p style={styles.userInstitution}>{user.institution_name}</p>
                        )}
                    </div>
                    <button style={styles.logout} onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* ── MOBILE OVERLAY ── */}
            {menuOpen && (
                <div style={styles.overlay} onClick={() => setMenuOpen(false)} />
            )}

            {/* ── MAIN CONTENT ── */}
            <div style={styles.main}>
                {page === 'dashboard' && <Dashboard />}
                {page === 'score'     && <ScoreIndividual />}
                {page === 'batch'     && <ScoreBatch />}
                {page === 'history'   && <ScoreHistory />}
                {page === 'applicant' && <ApplicantHistory />}
                {page === 'admin'     && user?.role === 'admin' && <AdminPanel />}
            </div>
        </div>
    );
}

const styles = {
    app: {
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
        background: '#f5f6fa',
    },

    // ── Mobile top bar (hidden on desktop) ──
    mobileTopBar: {
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        background: '#1a237e',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        '@media (maxWidth: 768px)': { display: 'flex' },
    },
    hamburger: {
        background: 'none', border: 'none',
        color: '#fff', fontSize: '22px', cursor: 'pointer',
    },
    mobileTitle: {
        color: '#fff', fontWeight: '800', fontSize: '18px',
    },
    mobileLogout: {
        background: 'rgba(255,255,255,0.15)', border: 'none',
        color: '#fff', padding: '6px 12px', borderRadius: '6px',
        cursor: 'pointer', fontSize: '13px',
    },

    // ── Sidebar ──
    sidebar: {
        width: '240px',
        background: '#1a237e',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 900,
        overflowY: 'auto',
        transition: 'transform 0.3s ease',
    },
    logo: {
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    logoText: {
        color: '#fff', margin: '0',
        fontSize: '24px', fontWeight: '800',
    },
    logoSub: {
        color: 'rgba(255,255,255,0.6)',
        margin: '4px 0 0 0', fontSize: '11px',
    },
    nav: { flex: 1, padding: '16px 0' },
    navItem: {
        width: '100%', padding: '13px 20px',
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '14px', textAlign: 'left',
        cursor: 'pointer', transition: 'background 0.2s',
    },
    navActive: {
        width: '100%', padding: '13px 20px',
        background: 'rgba(255,255,255,0.15)',
        border: 'none',
        borderLeft: '4px solid #fff',
        color: '#fff', fontSize: '14px',
        fontWeight: '600', textAlign: 'left',
        cursor: 'pointer',
    },
    userBox: {
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    userAvatar: {
        width: '40px', height: '40px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        color: '#fff', fontSize: '18px',
        fontWeight: '700',
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '6px',
    },
    userName: {
        color: '#fff', margin: '0',
        fontSize: '14px', fontWeight: '600',
    },
    userRole: {
        color: 'rgba(255,255,255,0.6)',
        margin: '0', fontSize: '12px',
        textTransform: 'capitalize',
    },
    userInstitution: {
        color: 'rgba(255,255,255,0.5)',
        margin: '0', fontSize: '11px',
    },
    logout: {
        marginTop: '8px',
        width: '100%', padding: '8px',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#fff', borderRadius: '6px',
        cursor: 'pointer', fontSize: '13px',
    },

    // ── Overlay for mobile ──
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 800,
    },

    // ── Main content ──
    main: {
        marginLeft: '240px',
        flex: 1,
        background: '#f5f6fa',
        minHeight: '100vh',
    },
};
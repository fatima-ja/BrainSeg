import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard   from './pages/Dashboard.jsx'
import Analysis    from './pages/Analysis.jsx'
import Patients    from './pages/Patients.jsx'
import History     from './pages/History.jsx'

function Sidebar() {
  const loc = useLocation()

  const links = [
    { to: '/',          icon: '⬡', label: 'Dashboard'  },
    { to: '/analysis',  icon: '⊕', label: 'New Scan'    },
    { to: '/patients',  icon: '◈', label: 'Patients'    },
    { to: '/history',   icon: '◎', label: 'History'     },
  ]

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>🧠</div>
        <div>
          <div style={styles.logoTitle}>BrainSeg</div>
          <div style={styles.logoSub}>AI · v1.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} style={({ isActive }) => ({
            ...styles.navLink,
            ...(isActive ? styles.navLinkActive : {})
          })}>
            <span style={styles.navIcon}>{l.icon}</span>
            <span>{l.label}</span>
            {loc.pathname === l.to && <div style={styles.navPip} />}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={styles.sidebarFooter}>
        <div style={styles.statusDot} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>System Online</span>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.shell}>
        <Sidebar />
        <main style={styles.main}>
          {/* Scanline effect */}
          <div style={styles.scanline} />
          <Routes>
            <Route path="/"          element={<Dashboard />}  />
            <Route path="/analysis"  element={<Analysis />}   />
            <Route path="/patients"  element={<Patients />}   />
            <Route path="/history"   element={<History />}    />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 220,
    minWidth: 220,
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 0',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 24px 32px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 28,
    filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.6))',
  },
  logoTitle: {
    fontFamily: 'var(--font-head)',
    fontWeight: 800,
    fontSize: 18,
    color: 'var(--text)',
    letterSpacing: '-0.5px',
  },
  logoSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent)',
    letterSpacing: 2,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '0 12px',
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'var(--muted)',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: 14,
    transition: 'all 0.2s',
    position: 'relative',
  },
  navLinkActive: {
    background: 'rgba(0,229,255,0.08)',
    color: 'var(--accent)',
    borderLeft: '2px solid var(--accent)',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  navPip: {
    position: 'absolute',
    right: 12,
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--accent)',
  },
  sidebarFooter: {
    padding: '16px 24px 0',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--green)',
    animation: 'pulse 2s infinite',
  },
  main: {
    flex: 1,
    padding: '40px 48px',
    position: 'relative',
    overflow: 'hidden',
  },
  scanline: {
    position: 'fixed',
    top: 0,
    left: 220,
    right: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)',
    pointerEvents: 'none',
    zIndex: 0,
  },
}

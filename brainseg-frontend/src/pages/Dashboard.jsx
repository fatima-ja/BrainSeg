import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API from '../config.js'

export default function Dashboard() {
  const [stats, setStats]     = useState({ patients: 0, scans: 0, tumors: 0 })
  const [recent, setRecent]   = useState([])
  const navigate              = useNavigate()

  useEffect(() => {
    axios.get(`${API}/patients`).then(r => {
      const patients = r.data
      setStats(s => ({ ...s, patients: patients.length }))

      // Load scans for each patient
      let allScans = []
      Promise.all(patients.map(p =>
        axios.get(`${API}/patients/${p.id}/scans`).then(r2 => {
          return r2.data.map(sc => ({ ...sc, patientName: p.name }))
        })
      )).then(results => {
        allScans = results.flat().sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        setRecent(allScans.slice(0, 5))
        setStats(s => ({
          ...s,
          scans:  allScans.length,
          tumors: allScans.filter(sc => sc.tumor_detected).length
        }))
      })
    }).catch(() => {})
  }, [])

  const statCards = [
    { label: 'Total Patients', value: stats.patients, icon: '◈', color: 'var(--accent)'  },
    { label: 'Total Scans',    value: stats.scans,    icon: '◎', color: 'var(--accent2)' },
    { label: 'Tumors Found',   value: stats.tumors,   icon: '⊗', color: 'var(--red)'     },
    { label: 'Clear Scans',    value: stats.scans - stats.tumors, icon: '✓', color: 'var(--green)' },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.tag}>SYSTEM OVERVIEW</div>
          <h1 style={s.title}>Dashboard</h1>
        </div>
        <button style={s.primaryBtn} onClick={() => navigate('/analysis')}>
          + New Scan
        </button>
      </div>

      {/* Stat Cards */}
      <div style={s.grid4}>
        {statCards.map((c, i) => (
          <div key={i} style={{ ...s.card, animationDelay: `${i * 0.07}s`, animation: 'fadeUp 0.4s ease forwards', opacity: 0 }}>
            <div style={{ ...s.cardIcon, color: c.color }}>{c.icon}</div>
            <div style={s.cardValue}>{c.value}</div>
            <div style={s.cardLabel}>{c.label}</div>
            <div style={{ ...s.cardBar, background: c.color }} />
          </div>
        ))}
      </div>

      {/* Recent Scans */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>Recent Scans</span>
          <span style={s.sectionMeta}>{recent.length} entries</span>
        </div>
        {recent.length === 0 ? (
          <div style={s.empty}>No scans yet — <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/analysis')}>run your first analysis</span></div>
        ) : (
          <div style={s.table}>
            <div style={s.tableHead}>
              <span>Patient</span><span>Date</span><span>Format</span><span>Coverage</span><span>Status</span>
            </div>
            {recent.map((sc, i) => (
              <div key={sc.id} style={{ ...s.tableRow, animationDelay: `${i * 0.05}s` }}>
                <span style={{ fontWeight: 600 }}>{sc.patientName}</span>
                <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {new Date(sc.created_at).toLocaleDateString()}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  {sc.input_format || 'png'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {sc.tumor_coverage_percent?.toFixed(1)}%
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, padding: '3px 10px',
                  borderRadius: 20,
                  background: sc.tumor_detected ? 'rgba(255,61,90,0.12)' : 'rgba(0,214,143,0.12)',
                  color: sc.tumor_detected ? 'var(--red)' : 'var(--green)',
                }}>
                  {sc.tumor_detected ? 'TUMOR' : 'CLEAR'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 },
  tag:    { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 },
  title:  { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 36, letterSpacing: '-1px', lineHeight: 1 },
  primaryBtn: {
    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontFamily: 'var(--font-head)', fontWeight: 700,
    fontSize: 14, cursor: 'pointer', letterSpacing: 0.5,
  },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
    padding: '24px 20px', position: 'relative', overflow: 'hidden',
  },
  cardIcon:  { fontSize: 20, marginBottom: 12 },
  cardValue: { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 40, lineHeight: 1, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: 0.5 },
  cardBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.6 },
  section:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  sectionHead:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' },
  sectionTitle: { fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 },
  sectionMeta:  { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' },
  empty: { padding: '40px 24px', textAlign: 'center', color: 'var(--muted)' },
  table: { padding: '0 8px 8px' },
  tableHead: {
    display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr 0.7fr 0.8fr',
    padding: '10px 16px', fontSize: 10, letterSpacing: 2,
    color: 'var(--muted)', fontFamily: 'var(--font-mono)',
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.7fr 0.7fr 0.8fr',
    padding: '14px 16px', borderRadius: 8, alignItems: 'center', fontSize: 13,
    transition: 'background 0.15s',
    cursor: 'default',
  },
}

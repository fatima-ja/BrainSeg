import { useState, useEffect } from 'react'
import axios from 'axios'
import API from '../config.js'

export default function Patients() {
  const [patients, setPatients] = useState([])
  const [form, setForm]         = useState({ name: '', age: '', gender: 'Male', notes: '' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    axios.get(`${API}/patients`).then(r => setPatients(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.age) return setError('Name and age are required')
    setLoading(true); setError('')
    try {
      await axios.post(`${API}/patients`, {
        name: form.name, age: parseInt(form.age),
        gender: form.gender, notes: form.notes
      })
      setSuccess('Patient created successfully')
      setForm({ name: '', age: '', gender: 'Male', notes: '' })
      setShowForm(false)
      load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create patient')
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this patient?')) return
    await axios.delete(`${API}/patients/${id}`).catch(() => {})
    load()
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.tag}>PATIENT MANAGEMENT</div>
          <h1 style={s.title}>Patients</h1>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Patient'}
        </button>
      </div>

      {/* Messages */}
      {error   && <div style={s.error}>⚠ {error}</div>}
      {success && <div style={s.successMsg}>✓ {success}</div>}

      {/* Create Form */}
      {showForm && (
        <div style={{ ...s.card, marginBottom: 24 }}>
          <div style={s.formTitle}>New Patient</div>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>FULL NAME</label>
              <input style={s.input} placeholder="Patient full name"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>AGE</label>
              <input style={s.input} placeholder="Age" type="number"
                value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label style={s.label}>GENDER</label>
              <select style={s.input} value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={s.label}>CLINICAL NOTES</label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical' }}
              placeholder="Optional clinical notes..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button style={{ ...s.primaryBtn, marginTop: 16 }} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Patient'}
          </button>
        </div>
      )}

      {/* Patient List */}
      {patients.length === 0 ? (
        <div style={s.empty}>No patients yet — add your first patient above</div>
      ) : (
        <div style={s.grid}>
          {patients.map((p, i) => (
            <div key={p.id} style={{ ...s.patientCard, animationDelay: `${i * 0.05}s`, animation: 'fadeUp 0.4s ease forwards', opacity: 0 }}>
              <div style={s.patientTop}>
                <div style={s.avatar}>{p.name[0].toUpperCase()}</div>
                <div>
                  <div style={s.patientName}>{p.name}</div>
                  <div style={s.patientMeta}>
                    <span style={s.pill}>{p.gender}</span>
                    <span style={s.pill}>Age {p.age}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
                  ID #{p.id}
                </div>
              </div>

              {p.notes && (
                <div style={s.notes}>{p.notes}</div>
              )}

              <div style={s.patientFooter}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
                <button style={s.deleteBtn} onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 },
  tag:       { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 },
  title:     { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 36, letterSpacing: '-1px' },
  primaryBtn:{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 22px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  error:     { background: 'rgba(255,61,90,0.08)', border: '1px solid rgba(255,61,90,0.3)', borderRadius: 8, padding: '12px 16px', color: 'var(--red)', fontSize: 13, marginBottom: 16 },
  successMsg:{ background: 'rgba(0,214,143,0.08)', border: '1px solid rgba(0,214,143,0.3)', borderRadius: 8, padding: '12px 16px', color: 'var(--green)', fontSize: 13, marginBottom: 16 },
  card:      { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  formTitle: { fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, marginBottom: 20 },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  label:     { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6, display: 'block' },
  input:     { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none' },
  empty:     { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '60px 40px', textAlign: 'center', color: 'var(--muted)' },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  patientCard:{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  patientTop:{ display: 'flex', alignItems: 'center', gap: 14 },
  avatar:    { width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--accent)', flexShrink: 0 },
  patientName:{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16 },
  patientMeta:{ display: 'flex', gap: 6, marginTop: 4 },
  pill:      { fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--bg3)', color: 'var(--muted)', letterSpacing: 0.5 },
  notes:     { fontSize: 12, color: 'var(--muted)', padding: '10px 12px', background: 'var(--bg3)', borderRadius: 6, lineHeight: 1.5 },
  patientFooter:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  deleteBtn: { background: 'transparent', border: 'none', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)', opacity: 0.6 },
}

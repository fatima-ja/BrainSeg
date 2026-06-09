import { useState, useEffect } from 'react'
import axios from 'axios'
import API from '../config.js'

export default function History() {
  const [patients,  setPatients]  = useState([])
  const [selected,  setSelected]  = useState(null)
  const [scans,     setScans]     = useState([])
  const [activeScan,setActiveScan]= useState(null)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    axios.get(`${API}/patients`).then(r => setPatients(r.data)).catch(() => {})
  }, [])

  const selectPatient = async (p) => {
    setSelected(p); setActiveScan(null); setLoading(true)
    const r = await axios.get(`${API}/patients/${p.id}/scans`).catch(() => ({ data: [] }))
    setScans(r.data)
    setLoading(false)
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={s.tag}>SCAN RECORDS</div>
      <h1 style={s.title}>History</h1>

      <div style={s.layout}>
        {/* Patient List */}
        <div style={s.sidebar}>
          <div style={s.sidebarHead}>Patients ({patients.length})</div>
          {patients.length === 0 && (
            <div style={s.empty}>No patients found</div>
          )}
          {patients.map(p => (
            <div key={p.id}
              style={{ ...s.patientItem, ...(selected?.id === p.id ? s.patientItemActive : {}) }}
              onClick={() => selectPatient(p)}
            >
              <div style={{ ...s.avatar, ...(selected?.id === p.id ? s.avatarActive : {}) }}>
                {p.name[0].toUpperCase()}
              </div>
              <div>
                <div style={s.patientName}>{p.name}</div>
                <div style={s.patientMeta}>ID #{p.id} · Age {p.age}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Scans Panel */}
        <div style={s.main}>
          {!selected && (
            <div style={s.emptyMain}>
              <div style={s.emptyIcon}>◎</div>
              <div style={s.emptyText}>Select a patient to view their scan history</div>
            </div>
          )}

          {selected && (
            <>
              <div style={s.panelHead}>
                <div>
                  <div style={s.panelTitle}>{selected.name}</div>
                  <div style={s.panelSub}>{scans.length} scan{scans.length !== 1 ? 's' : ''} on record</div>
                </div>
              </div>

              {loading && <div style={s.loading}>Loading scans...</div>}

              {!loading && scans.length === 0 && (
                <div style={s.emptyMain}>
                  <div style={s.emptyIcon}>⊕</div>
                  <div style={s.emptyText}>No scans for this patient yet</div>
                </div>
              )}

              {!loading && scans.map((sc, i) => (
                <div key={sc.id} style={{ ...s.scanCard, ...(activeScan?.id === sc.id ? s.scanCardActive : {}) }}
                  onClick={() => setActiveScan(activeScan?.id === sc.id ? null : sc)}>
                  {/* Scan Header */}
                  <div style={s.scanHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                        #{sc.id} · {new Date(sc.created_at).toLocaleDateString()} {new Date(sc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 1,
                        background: sc.tumor_detected ? 'rgba(255,61,90,0.12)' : 'rgba(0,214,143,0.12)',
                        color: sc.tumor_detected ? 'var(--red)' : 'var(--green)',
                      }}>
                        {sc.tumor_detected ? 'TUMOR' : 'CLEAR'}
                      </span>
                      {sc.input_format && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase' }}>
                          {sc.input_format}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                      {sc.tumor_coverage_percent?.toFixed(1)}% coverage · {activeScan?.id === sc.id ? '▲' : '▼'}
                    </div>
                  </div>

                  {/* Expanded */}
                  {activeScan?.id === sc.id && (
                    <div style={s.scanBody}>
                      {/* Images */}
                      <div style={s.imgRow}>
                        {sc.scan_path && (
                          <div style={s.imgBox}>
                            <div style={s.imgLabel}>ORIGINAL</div>
                            <img src={`${API}/${sc.scan_path}`} alt="MRI" style={s.scanImg}
                              onError={e => e.target.style.display = 'none'} />
                          </div>
                        )}
                        {sc.segmentation_path && (
                          <div style={s.imgBox}>
                            <div style={s.imgLabel}>SEGMENTATION</div>
                            <img src={`${API}/${sc.segmentation_path}`} alt="Seg" style={s.scanImg}
                              onError={e => e.target.style.display = 'none'} />
                          </div>
                        )}
                      </div>

                      {/* Analysis */}
                      {sc.analysis && (
                        <div style={s.analysisBox}>
                          <div style={s.imgLabel}>AI ANALYSIS</div>
                          <div style={s.analysisText}>{sc.analysis}</div>
                        </div>
                      )}

                      {/* Download */}
                      <button
                        style={s.downloadBtn}
                        onClick={e => { e.stopPropagation(); window.open(`${API}/report/${sc.id}`, '_blank') }}
                      >
                        📄 Download PDF Report
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  tag:   { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 },
  title: { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 36, letterSpacing: '-1px', marginBottom: 28 },
  layout:  { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' },
  sidebar: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  sidebarHead: { padding: '14px 18px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)' },
  patientItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid var(--border)' },
  patientItemActive: { background: 'rgba(0,229,255,0.06)', borderLeft: '2px solid var(--accent)' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 14, color: 'var(--muted)', flexShrink: 0 },
  avatarActive: { background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' },
  patientName: { fontWeight: 600, fontSize: 13 },
  patientMeta: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 },
  empty: { padding: '24px 18px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' },
  main:  { display: 'flex', flexDirection: 'column', gap: 12 },
  emptyMain: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '80px 40px', textAlign: 'center' },
  emptyIcon: { fontSize: 40, color: 'var(--border)', marginBottom: 12 },
  emptyText: { color: 'var(--muted)', fontSize: 14 },
  loading: { color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 20 },
  panelHead: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18 },
  panelSub: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 2 },
  scanCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s' },
  scanCardActive: { borderColor: 'var(--accent)' },
  scanHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' },
  scanBody: { padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border)' },
  imgRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 },
  imgBox:  { display: 'flex', flexDirection: 'column', gap: 8 },
  imgLabel:{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)' },
  scanImg: { width: '100%', borderRadius: 6, border: '1px solid var(--border)', display: 'block' },
  analysisBox: { background: 'var(--bg3)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  analysisText:{ fontSize: 12, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' },
  downloadBtn: { background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start' },
}

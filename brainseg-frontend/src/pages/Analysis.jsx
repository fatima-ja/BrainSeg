import { useState, useRef } from 'react'
import axios from 'axios'
import API from '../config.js'

const MODALITIES = [
  { key: 't1',    label: 'T1',    desc: 'T1-weighted' },
  { key: 't1ce',  label: 'T1ce',  desc: 'T1 contrast-enhanced' },
  { key: 't2',    label: 'T2',    desc: 'T2-weighted' },
  { key: 'flair', label: 'FLAIR', desc: 'Fluid-attenuated' },
]

const CLASS_COLORS = {
  'Necrotic Core':   '#ff0000',
  'Edema':           '#00ffff',
  'Enhancing Tumor': '#ffff00',
}

export default function Analysis() {
  const [step, setStep]             = useState(1)
  const [patientId, setPatientId]   = useState('')
  const [mode, setMode]             = useState('single')
  const [files, setFiles]           = useState({ t1: null, t1ce: null, t2: null, flair: null })
  const [singleFile, setSingleFile] = useState(null)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState('')
  const [progress, setProgress]     = useState(0)
  const fileRefs = { t1: useRef(), t1ce: useRef(), t2: useRef(), flair: useRef() }
  const singleRef = useRef()

  const handleSingleFile = (f) => { setSingleFile(f); setError('') }
  const handleModalityFile = (key, f) => { setFiles(prev => ({ ...prev, [key]: f })); setError('') }
  const allModalitiesLoaded = Object.values(files).every(f => f !== null)

  const handleAnalyze = async () => {
    if (!patientId) return setError('Please enter a Patient ID')
    if (mode === 'single' && !singleFile) return setError('Please upload an MRI scan')
    if (mode === 'multi' && !allModalitiesLoaded) return setError('Please upload all 4 modality files')

    setError(''); setStep(2); setProgress(0)
    const form = new FormData()

    if (mode === 'single') {
      form.append('file', singleFile)
    } else {
      form.append('t1',    files.t1)
      form.append('t1ce',  files.t1ce)
      form.append('t2',    files.t2)
      form.append('flair', files.flair)
    }

    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 2, 90)), 600)
      const endpoint = mode === 'single'
        ? `${API}/analyze/${patientId}`
        : `${API}/analyze4ch/${patientId}`

      const res = await axios.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => { setResult(res.data); setStep(3) }, 500)
    } catch (err) {
      setStep(1)
      setError(err.response?.data?.detail || 'Analysis failed. Check patient ID and try again.')
    }
  }

  const reset = () => {
    setStep(1); setSingleFile(null); setResult(null)
    setError(''); setPatientId('')
    setFiles({ t1: null, t1ce: null, t2: null, flair: null })
  }

  const buildUrl = (path) => {
    if (!path) return null
    const clean = path.replace(/\\/g, '/')
    if (clean.startsWith('http')) return clean
    const stripped = clean.startsWith('/') ? clean.slice(1) : clean
    return `${API}/${stripped}`
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease', maxWidth: 960 }}>
      <div style={s.header}>
        <div style={s.tag}>MRI ANALYSIS</div>
        <h1 style={s.title}>New Scan</h1>
      </div>

      {/* ── Step 1 — Upload ─────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={s.card}>
            <label style={s.label}>PATIENT ID</label>
            <input style={s.input} placeholder="Enter patient ID number..."
              value={patientId} onChange={e => setPatientId(e.target.value)} />
            <div style={s.hint}>Create a patient first via the Patients page if needed</div>
          </div>

          <div style={s.card}>
            <label style={s.label}>UPLOAD MODE</label>
            <div style={s.modeRow}>
              <button style={{ ...s.modeBtn, ...(mode === 'single' ? s.modeBtnActive : {}) }}
                onClick={() => setMode('single')}>
                Single File
                <span style={s.modeSub}>Any format</span>
              </button>
              <button style={{ ...s.modeBtn, ...(mode === 'multi' ? s.modeBtnActive : {}) }}
                onClick={() => setMode('multi')}>
                4 Modalities
                <span style={s.modeSub}>T1 · T1ce · T2 · FLAIR</span>
              </button>
            </div>
          </div>

          {mode === 'single' && (
            <div style={s.card}>
              <label style={s.label}>MRI SCAN FILE</label>
              <div style={{ ...s.dropzone, ...(singleFile ? s.dropzoneActive : {}) }}
                onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleSingleFile(e.dataTransfer.files[0]) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => singleRef.current.click()}>
                <input ref={singleRef} type="file" style={{ display: 'none' }}
                  accept=".nii,.nii.gz,.dcm,.jpg,.jpeg,.png,.bmp,.tiff"
                  onChange={e => e.target.files[0] && handleSingleFile(e.target.files[0])} />
                {singleFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.fileIcon}>📁</div>
                    <div style={s.fileName}>{singleFile.name}</div>
                    <div style={s.fileSize}>{(singleFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.uploadIcon}>⊕</div>
                    <div style={s.uploadText}>Drop file here or click to browse</div>
                    <div style={s.uploadSub}>.nii · .nii.gz · .dcm · .jpg · .png · .bmp · .tiff</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'multi' && (
            <div style={s.card}>
              <label style={s.label}>4 MODALITY FILES (.nii / .nii.gz)</label>
              <div style={s.modalityGrid}>
                {MODALITIES.map(m => (
                  <div key={m.key}
                    style={{ ...s.modalityBox, ...(files[m.key] ? s.modalityBoxDone : {}) }}
                    onClick={() => fileRefs[m.key].current.click()}>
                    <input ref={fileRefs[m.key]} type="file" style={{ display: 'none' }}
                      accept=".nii,.nii.gz"
                      onChange={e => e.target.files[0] && handleModalityFile(m.key, e.target.files[0])} />
                    <div style={s.modalityLabel}>{m.label}</div>
                    <div style={s.modalityDesc}>{m.desc}</div>
                    <div style={s.modalityFile}>
                      {files[m.key]
                        ? <><span style={{ color: 'var(--green)' }}>✓</span> {files[m.key].name}</>
                        : 'Click to upload'}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...s.hint, marginTop: 12 }}>
                {allModalitiesLoaded
                  ? '✓ All 4 modalities loaded — ready to analyze'
                  : `${Object.values(files).filter(Boolean).length} / 4 files loaded`}
              </div>
            </div>
          )}

          {error && <div style={s.error}>⚠ {error}</div>}

          <button style={{
            ...s.analyzeBtn,
            opacity: (mode === 'single' && !singleFile) || (mode === 'multi' && !allModalitiesLoaded) ? 0.5 : 1
          }} onClick={handleAnalyze}>
            Run Analysis →
          </button>
        </div>
      )}

      {/* ── Step 2 — Loading ────────────────────────────────────────── */}
      {step === 2 && (
        <div style={s.loadingCard}>
          <div style={{ fontSize: 60, marginBottom: 24, animation: 'pulse 2s infinite' }}>🧠</div>
          <div style={s.loadingTitle}>Analyzing MRI Scan</div>
          <div style={s.loadingDesc}>Running U-Net segmentation & MedGemma analysis...</div>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: `${progress}%` }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginBottom: 24 }}>
            {progress}%
          </div>
          <div style={s.loadingSteps}>
            <div style={{ color: progress > 20  ? 'var(--green)' : 'var(--muted)' }}>✓ Loading image</div>
            <div style={{ color: progress > 50  ? 'var(--green)' : 'var(--muted)' }}>✓ U-Net segmentation</div>
            <div style={{ color: progress > 80  ? 'var(--green)' : 'var(--muted)' }}>✓ MedGemma analysis</div>
            <div style={{ color: progress >= 100 ? 'var(--green)' : 'var(--muted)' }}>✓ Generating report</div>
          </div>
        </div>
      )}

      {/* ── Step 3 — Results ────────────────────────────────────────── */}
      {step === 3 && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status Banner */}
          <div style={{
            ...s.banner,
            background:  result.segmentation.tumor_detected ? 'rgba(255,61,90,0.08)' : 'rgba(0,214,143,0.08)',
            borderColor: result.segmentation.tumor_detected ? 'var(--red)'           : 'var(--green)',
          }}>
            <span style={{ fontSize: 28 }}>{result.segmentation.tumor_detected ? '⚠' : '✓'}</span>
            <div>
              <div style={{
                fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 20,
                color: result.segmentation.tumor_detected ? 'var(--red)' : 'var(--green)'
              }}>
                {result.segmentation.tumor_detected ? 'Tumor Detected' : 'No Tumor Detected'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
                Coverage: {result.segmentation.tumor_coverage_percent}% ·
                Pixels: {result.segmentation.tumor_pixels?.toLocaleString()} ·
                Format: {result.segmentation.input_format}
              </div>
              {result.segmentation.classes_detected?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {result.segmentation.classes_detected.map(cls => (
                    <span key={cls} style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700,
                      background: `${CLASS_COLORS[cls] || '#888'}22`,
                      color: CLASS_COLORS[cls] || '#888',
                      border: `1px solid ${CLASS_COLORS[cls] || '#888'}`,
                    }}>{cls}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={s.legend}>
            {Object.entries(CLASS_COLORS).map(([name, color]) => (
              <div key={name} style={s.legendItem}>
                <div style={{ ...s.legendDot, background: color }} />
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{name}</span>
              </div>
            ))}
          </div>

          {/* Images — 4 modality overlays or single */}
          {result.segmentation.segmentation_paths ? (
            <div style={s.grid4}>
              {Object.entries(result.segmentation.segmentation_paths).map(([mod, path]) => (
                <div key={mod} style={s.imageCard}>
                  <div style={s.imageLabel}>{mod.toUpperCase()} OVERLAY</div>
                  <img src={buildUrl(path)} alt={mod} style={s.resultImg}
                    onError={e => e.target.style.display = 'none'} />
                </div>
              ))}
            </div>
          ) : (
            <div style={s.imageGrid}>
              <div style={s.imageCard}>
                <div style={s.imageLabel}>ORIGINAL MRI</div>
                {buildUrl(result.segmentation.preview_path)
                  ? <img src={buildUrl(result.segmentation.preview_path)} alt="Original" style={s.resultImg}
                      onError={e => e.target.style.display = 'none'} />
                  : <div style={s.noImg}>Preview not available</div>}
              </div>
              <div style={s.imageCard}>
                <div style={s.imageLabel}>SEGMENTATION OVERLAY</div>
                {buildUrl(result.segmentation.segmentation_path)
                  ? <img src={buildUrl(result.segmentation.segmentation_path)} alt="Segmentation" style={s.resultImg}
                      onError={e => e.target.style.display = 'none'} />
                  : <div style={s.noImg}>Segmentation not available</div>}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          <div style={s.card}>
            <div style={s.label}>MEDGEMMA AI ANALYSIS</div>
            <div style={s.analysisText}>{result.analysis || 'No analysis available.'}</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={s.analyzeBtn}
              onClick={() => window.open(`${API}/report/${result.scan_id}`, '_blank')}>
              📄 Download PDF Report
            </button>
            <button style={s.secondaryBtn} onClick={reset}>+ New Scan</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header:       { marginBottom: 32 },
  tag:          { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', marginBottom: 6 },
  title:        { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 36, letterSpacing: '-1px' },
  card:         { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  label:        { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 10, display: 'block' },
  hint:         { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8 },
  input:        { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' },
  modeRow:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 },
  modeBtn:      { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, textAlign: 'left' },
  modeBtnActive:{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(0,229,255,0.06)' },
  modeSub:      { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', fontWeight: 400 },
  dropzone:     { border: '2px dashed var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginTop: 4 },
  dropzoneActive:{ borderColor: 'var(--accent)', background: 'rgba(0,229,255,0.04)' },
  uploadIcon:   { fontSize: 36, color: 'var(--accent)', marginBottom: 12 },
  uploadText:   { fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  uploadSub:    { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' },
  fileIcon:     { fontSize: 40, marginBottom: 10 },
  fileName:     { fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', marginBottom: 4 },
  fileSize:     { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' },
  modalityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 },
  modalityBox:  { border: '2px dashed var(--border)', borderRadius: 8, padding: '16px', cursor: 'pointer', transition: 'all 0.2s' },
  modalityBoxDone:{ borderColor: 'var(--green)', background: 'rgba(0,214,143,0.04)' },
  modalityLabel:{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: 'var(--accent)', marginBottom: 2 },
  modalityDesc: { fontSize: 11, color: 'var(--muted)', marginBottom: 8 },
  modalityFile: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', wordBreak: 'break-all' },
  error:        { background: 'rgba(255,61,90,0.08)', border: '1px solid rgba(255,61,90,0.3)', borderRadius: 8, padding: '12px 16px', color: 'var(--red)', fontSize: 13 },
  analyzeBtn:   { background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, padding: '14px 28px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, cursor: 'pointer', letterSpacing: 0.5 },
  secondaryBtn: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 28px', fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  loadingCard:  { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '60px 40px', textAlign: 'center' },
  loadingTitle: { fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 24, marginBottom: 8 },
  loadingDesc:  { color: 'var(--muted)', fontSize: 14, marginBottom: 32 },
  progressTrack:{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  progressBar:  { height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' },
  loadingSteps: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontFamily: 'var(--font-mono)', alignItems: 'center' },
  banner:       { display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px', borderRadius: 12, border: '1px solid' },
  legend:       { display: 'flex', gap: 20, padding: '12px 16px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' },
  legendItem:   { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot:    { width: 10, height: 10, borderRadius: 2 },
  imageGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid4:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  imageCard:    { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
  imageLabel:   { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', marginBottom: 12 },
  resultImg:    { width: '100%', borderRadius: 8, display: 'block' },
  noImg:        { color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: '40px 0', textAlign: 'center' },
  analysisText: { fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' },
}

import { useState, useRef } from 'react'
import { trainManual, trainAuto } from '../api'

const CLASSIFICATION_MODELS = [
  'Logistic Regression',
  'Ridge Classifier',
  'Random Forest',
  'XGBoost',
  'LightGBM',
  'KNN',
]

const REGRESSION_MODELS = [
  'ElasticNet',
  'Random Forest',
  'XGBoost',
  'LightGBM',
  'KNN',
]

export default function TrainModal({ onClose, onCreated }) {
  const [tab, setTab] = useState('manual') // manual | auto
  const [file, setFile] = useState(null)
  const [targetColumn, setTargetColumn] = useState('')
  const [isClassification, setIsClassification] = useState(true)
  const [modelName, setModelName] = useState('Random Forest')
  const [intensity, setIntensity] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const modelOptions = isClassification ? CLASSIFICATION_MODELS : REGRESSION_MODELS

  // Reset model name when switching problem type
  function handleProblemTypeChange(classification) {
    setIsClassification(classification)
    const opts = classification ? CLASSIFICATION_MODELS : REGRESSION_MODELS
    if (!opts.includes(modelName)) {
      setModelName(opts[0])
    }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (f) setFile(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!file) {
      setError('Please select a file')
      return
    }
    if (!targetColumn.trim()) {
      setError('Please enter the target column')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('target_column', targetColumn)
      fd.append('problem_type_classification', isClassification)
      fd.append('intensity', intensity)

      let data
      if (tab === 'manual') {
        fd.append('model_name', modelName)
        data = await trainManual(fd)
      } else {
        data = await trainAuto(fd)
      }

      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to start training')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div className="backdrop" style={{ position: 'absolute', inset: 0, zIndex: -1 }} onClick={onClose} />

        <div
          className="animate-slide-up"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '32rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          }}
        >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>New Training Job</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.375rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button
            className={`tab ${tab === 'manual' ? 'active' : ''}`}
            onClick={() => setTab('manual')}
          >
            Manual Training
          </button>
          <button
            className={`tab ${tab === 'auto' ? 'active' : ''}`}
            onClick={() => setTab('auto')}
          >
            Auto Training
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* File Upload */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label">Dataset File</label>
            <div
              className={`file-drop ${file ? 'active' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileDrop}
              />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{file.name}</span>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Drop CSV or Excel file here, or <span style={{ color: 'var(--primary)', fontWeight: 500 }}>browse</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Target Column */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label" htmlFor="target_col">Target Column</label>
            <input
              id="target_col"
              className="input"
              placeholder="e.g. price, label, category"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              required
            />
          </div>

          {/* Problem Type */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="label">Problem Type</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-option ${isClassification ? 'active' : ''}`}
                onClick={() => handleProblemTypeChange(true)}
              >
                Classification
              </button>
              <button
                type="button"
                className={`toggle-option ${!isClassification ? 'active' : ''}`}
                onClick={() => handleProblemTypeChange(false)}
              >
                Regression
              </button>
            </div>
          </div>

          {/* Model Name (manual only) */}
          {tab === 'manual' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="model_name">Model</label>
              <select
                id="model_name"
                className="select"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'auto' && (
            <div
              className="card"
              style={{
                marginBottom: '1.25rem',
                padding: '0.875rem 1rem',
                background: 'var(--accent)',
                border: '1px solid var(--ring)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <p style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>
                Optuna will automatically select the best model and tune hyperparameters for you.
              </p>
            </div>
          )}

          {/* Intensity */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label className="label" htmlFor="intensity">Training Intensity</label>
            <select
              id="intensity"
              className="select"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
            >
              <option value="low">Low — faster, less tuning</option>
              <option value="medium">Medium — balanced</option>
              <option value="high">High — thorough, slower</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {tab === 'manual' ? 'Start Training' : 'Start Auto Training'}
          </button>
        </form>
        </div>
      </div>
    </>
  )
}

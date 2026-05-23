import { useState, useEffect } from 'react'
import { getModelDetail, getModelFeatures, deleteModel } from '../api'

export default function ModelDetailPanel({ model, onClose, onDeleted }) {
  const [detail, setDetail] = useState(null)
  const [features, setFeatures] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!model) return
    setLoading(true)
    Promise.all([
      getModelDetail(model.model_id),
      getModelFeatures(model.model_id),
    ])
      .then(([d, f]) => {
        setDetail(d)
        setFeatures(f)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [model])

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this model?')) return
    setDeleting(true)
    try {
      await deleteModel(model.model_id)
      onDeleted(model.model_id)
      onClose()
    } catch {
      alert('Failed to delete model')
    } finally {
      setDeleting(false)
    }
  }

  function copyEndpoint() {
    const url = `${import.meta.env.VITE_API_BASE_URL}/models/${model.model_id}/predict`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!model) return null

  const API = import.meta.env.VITE_API_BASE_URL
  const rawDate = detail?.created_at
    ? (detail.created_at.endsWith('Z') || detail.created_at.includes('+') ? detail.created_at : `${detail.created_at}Z`)
    : null
    
  const created = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

  // Resolve problem type from multiple possible API field names
  const problemType = (() => {
    const d = detail || model
    if (d?.type) return d.type
    if (d?.problem_type) return d.problem_type
    if (typeof d?.problem_type_classification === 'boolean') {
      return d.problem_type_classification ? 'Classification' : 'Regression'
    }
    return null
  })()

  const scoreLabel =
    problemType?.toLowerCase() === 'classification'
      ? 'Accuracy'
      : 'R²'

  // Extract file name from API response
  const fileName = detail?.file_name || detail?.filename || detail?.original_filename
    || model?.file_name || model?.filename || model?.original_filename || null

  const exampleBody = features?.example_input
    ? JSON.stringify(features.example_input, null, 2)
    : '{\n  "feature1": value,\n  "feature2": value\n}'

  const snippet = `POST ${API}/models/${model.model_id}/predict
X-API-Key: sk-your-api-key-here
Content-Type: application/json

${exampleBody}`

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
        {/* Backdrop */}
        <div className="backdrop" style={{ position: 'absolute', inset: 0, zIndex: -1 }} onClick={onClose} />

        {/* Panel */}
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
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          }}
        >
        {/* Close */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.375rem',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : (
          <>
            {/* Model Icon & Name */}
            <div
              style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, var(--primary), var(--ring))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              {detail?.model_name}
            </h2>

            {/* File name */}
            {fileName && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  color: 'var(--secondary)',
                  marginBottom: '0.25rem',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                {fileName}
              </div>
            )}

            {/* Meta grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="card" style={{ padding: '1rem' }}>
                <span className="label" style={{ marginBottom: '0.25rem' }}>Score</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {typeof detail?.score === 'number' ? detail.score.toFixed(4) : '—'}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{scoreLabel}</span>
              </div>
              <div className="card" style={{ padding: '1rem' }}>
                <span className="label" style={{ marginBottom: '0.25rem' }}>Type</span>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{problemType || '—'}</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Problem Type</span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span className="label">Created</span>
              <p style={{ fontSize: '0.875rem' }}>{created}</p>
            </div>

            {features?.features && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span className="label">Features ({features.feature_count || Object.keys(features.features).length})</span>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.375rem',
                    marginTop: '0.5rem',
                  }}
                >
                  {Object.entries(features.features).map(([name, type]) => (
                    <span
                      key={name}
                      className="badge"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {name}
                      <span style={{ opacity: 0.6, fontSize: '0.625rem', marginLeft: '0.25rem' }}>
                        {type}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail?.hyperparameters && Object.keys(detail.hyperparameters).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <span className="label">Hyperparameters</span>
                <div className="code-block" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  {JSON.stringify(detail.hyperparameters, null, 2)}
                </div>
              </div>
            )}

            {/* Prediction API Section */}
            <div
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1.5rem',
                marginTop: '0.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Use this model in your project
              </h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--secondary)',
                  marginBottom: '1rem',
                }}
              >
                Call <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  GET /models/{model.model_id}/features
                </code> first to see expected input fields.
              </p>

              <div className="code-block" style={{ marginBottom: '0.75rem' }}>
                <button className="copy-btn" onClick={copyEndpoint}>
                  {copied ? '✓ Copied!' : 'Copy URL'}
                </button>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {snippet}
                </pre>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                Generate an API key from the <strong>API Keys</strong> tab in the sidebar.
              </p>
            </div>

            {/* Delete */}
            <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
              <button
                className="btn btn-destructive"
                style={{ width: '100%' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && <span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} />}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Model
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  )
}

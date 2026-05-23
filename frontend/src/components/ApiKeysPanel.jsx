import { useState, useEffect, useCallback } from 'react'
import { createApiKey, getApiKeys, deleteApiKey } from '../api'

export default function ApiKeysPanel() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [keyName, setKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [newKey, setNewKey] = useState(null) // raw key shown ONCE after creation
  const [copied, setCopied] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const data = await getApiKeys()
      setKeys(data || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleCreate(e) {
    e.preventDefault()
    if (!keyName.trim()) return
    setCreating(true)
    setError('')
    try {
      const result = await createApiKey(keyName.trim())
      setNewKey(result)
      setKeyName('')
      fetchKeys()
    } catch (err) {
      setError(err.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(keyId, name) {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return
    try {
      await deleteApiKey(keyId)
      setKeys((prev) => prev.filter((k) => k.key_id !== keyId))
    } catch {
      alert('Failed to revoke API key')
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>API Keys</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
          Create and manage API keys for external integrations — no login required
        </p>
      </div>

      {/* ── New Key Created Banner ── */}
      {newKey && (
        <div className="api-key-reveal animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <div className="api-key-reveal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(22 163 74)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span style={{ fontWeight: 600, color: 'rgb(22 101 52)' }}>
                API Key Created — "{newKey.name}"
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setNewKey(null)}
              style={{ color: 'var(--secondary)', padding: '0.25rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Warning */}
          <div className="api-key-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Save this key now — it will <strong>never</strong> be shown again!</span>
          </div>

          {/* Raw Key Display */}
          <div className="api-key-value-box">
            <code className="api-key-value">{newKey.raw_key}</code>
            <button
              className="btn btn-sm"
              onClick={() => copyToClipboard(newKey.raw_key)}
              style={{
                background: copied ? 'rgb(22 163 74)' : 'var(--primary)',
                color: '#fff',
                minWidth: '5rem',
                transition: 'all 0.2s',
              }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Create Key Form ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '14rem' }}>
            <label className="label" htmlFor="api-key-name">Key Name</label>
            <input
              id="api-key-name"
              type="text"
              className="input"
              placeholder='e.g. "My App", "Production", "Testing"'
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              maxLength={100}
              disabled={creating}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={creating || !keyName.trim()}
            style={{ height: '2.75rem' }}
          >
            {creating ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Generate Key
              </>
            )}
          </button>
        </form>
        {error && <div className="error-msg" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{error}</div>}
      </div>

      {/* ── Keys List ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
        </div>
      ) : keys.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: 'var(--secondary)',
          }}
        >
          <svg
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ margin: '0 auto 1rem' }}
          >
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '1.0625rem' }}>No API keys yet</p>
          <p style={{ fontSize: '0.8125rem' }}>
            Create an API key above to start making predictions without login
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {keys.map((k) => (
            <div
              key={k.key_id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem 1.25rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                {/* Key icon */}
                <div
                  style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '0.75rem',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                  </svg>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{k.name}</div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.125rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8125rem',
                      color: 'var(--secondary)',
                      background: 'var(--muted)',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '0.375rem',
                    }}>
                      {k.key_prefix}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                      Created {formatDate(k.created_at)}
                    </span>
                    {k.last_used_at && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--secondary)' }}>
                        Last used {formatDate(k.last_used_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleDelete(k.key_id, k.name)}
                style={{ color: 'var(--destructive)', borderColor: 'var(--destructive)', flexShrink: 0 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgb(254 226 226)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

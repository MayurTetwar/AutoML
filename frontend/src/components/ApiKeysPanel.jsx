import { useState, useEffect, useCallback } from 'react'
import { createApiKey, getApiKeys, deleteApiKey } from '../api'
import { Key, Plus, Copy, Check, Trash2, AlertTriangle, CheckCircle, X, Shield, Code } from 'lucide-react'

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
    })
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays > 0) return `${diffDays} days ago`
    if (diffHours > 0) return `${diffHours} hours ago`
    if (diffMins > 0) return `${diffMins} minutes ago`
    return 'Just now'
  }

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">API Keys</h1>
        <p className="text-sm text-gray-500">
          Manage and generate secret keys for programmatic access to the AutoML.ai platform. Do not share your secret keys in publicly accessible areas.
        </p>
      </div>

      {/* ── New Key Created Banner ── */}
      {newKey && (
        <div className="mb-6 bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5 glow-green animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-emerald-400 text-lg">Key Generated Successfully</span>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="p-1 text-gray-500 hover:text-white rounded transition-colors cursor-pointer bg-transparent border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning */}
          <div className="flex items-center gap-2 mb-4 text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Please copy this key now. For your security, it will not be shown again.</span>
          </div>

          {/* Key Value */}
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3">
            <code className="flex-1 font-mono text-sm text-gray-300 break-all select-all">
              {newKey.raw_key}
            </code>
            <button
              onClick={() => copyToClipboard(newKey.raw_key)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer bg-transparent border-none flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Create Key Form ── */}
      <div className="mb-8">
        <form onSubmit={handleCreate} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[14rem]">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2" htmlFor="api-key-name">
              New Key Name
            </label>
            <input
              id="api-key-name"
              type="text"
              className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
              placeholder="e.g., Production Environment"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              maxLength={100}
              disabled={creating}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
            disabled={creating || !keyName.trim()}
          >
            {creating ? (
              <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create new secret key
          </button>
        </form>
        {error && (
          <div className="mt-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ── Keys List ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-[#121212] border border-white/10 rounded-2xl text-center py-16 px-6">
          <Key className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-white font-medium text-lg mb-1">No API keys yet</p>
          <p className="text-gray-500 text-sm">Create an API key above to start making predictions without login</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keys.map((k) => (
            <div
              key={k.key_id}
              className="bg-[#121212] border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:border-white/15 flex flex-col gap-4"
            >
              {/* Header: Icon + Name + Status */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  {k.status === 'active' ? (
                    <Shield className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Code className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{k.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium mt-0.5 ${
                    k.status === 'active' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${k.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                    {(k.status || 'ACTIVE').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Key Prefix */}
              <code className="text-sm font-mono text-gray-500 break-all">
                {k.key_prefix}••••••••••••••••
              </code>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-500">
                <div>
                  <span className="block uppercase tracking-wider text-[10px] text-gray-600 mb-0.5">Created</span>
                  <span className="text-gray-400">{formatDate(k.created_at)}</span>
                </div>
                <div className="text-right">
                  <span className="block uppercase tracking-wider text-[10px] text-gray-600 mb-0.5">Last Used</span>
                  <span className="text-gray-400">{k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

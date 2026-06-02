import { useState, useEffect } from 'react'
import { getModelDetail, getModelFeatures, deleteModel } from '../api'
import { X, Copy, Check, Trash2, Box, Loader2 } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="backdrop absolute inset-0 z-[-1]" onClick={onClose} />

      {/* Panel */}
      <div className="animate-slide-up relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer bg-transparent border-none z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : (
          <>
            {/* Model Icon & Name */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-4">
              <Box className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {detail?.model_name}
            </h2>

            {/* File name */}
            {fileName && (
              <p className="text-sm text-gray-500 mb-4">{fileName}</p>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Score</span>
                <div className="text-2xl font-bold text-indigo-400">
                  {typeof detail?.score === 'number' ? detail.score.toFixed(4) : '—'}
                </div>
                <span className="text-xs text-gray-500">{scoreLabel}</span>
              </div>
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Type</span>
                <div className="text-base font-semibold text-white mt-1">{problemType || '—'}</div>
                <span className="text-xs text-gray-500">Problem Type</span>
              </div>
            </div>

            <div className="mb-4">
              <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Created</span>
              <p className="text-sm text-gray-300">{created}</p>
            </div>

            {features?.features && (
              <div className="mb-6">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Features ({features.feature_count || Object.keys(features.features).length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(features.features).map(([name, type]) => (
                    <span
                      key={name}
                      className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300"
                    >
                      {name}
                      <span className="text-gray-500 ml-1 text-[10px]">{type}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail?.hyperparameters && Object.keys(detail.hyperparameters).length > 0 && (
              <div className="mb-6">
                <span className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Hyperparameters</span>
                <pre className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto">
                  {JSON.stringify(detail.hyperparameters, null, 2)}
                </pre>
              </div>
            )}

            {/* Prediction API Section */}
            <div className="border-t border-white/10 pt-6 mt-2">
              <h3 className="text-base font-semibold text-white mb-1">Use this model in your project</h3>
              <p className="text-xs text-gray-500 mb-4">
                Call <code className="font-mono text-indigo-400 text-[11px]">GET /models/{model.model_id}/features</code> first to see expected input fields.
              </p>

              <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl p-4 mb-3">
                <button
                  onClick={copyEndpoint}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer bg-transparent border-none"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all pr-20">
                  {snippet}
                </pre>
              </div>

              <p className="text-xs text-gray-600">
                Generate an API key from the <strong className="text-gray-400">API Keys</strong> tab in the sidebar.
              </p>
            </div>

            {/* Delete */}
            <div className="mt-auto pt-6">
              <button
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 cursor-pointer text-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Model
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

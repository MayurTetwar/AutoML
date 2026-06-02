import { useState, useRef } from 'react'
import { trainManual, trainAuto } from '../api'
import { X, Upload, Play, Zap, Loader2 } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="backdrop absolute inset-0 z-[-1]" onClick={onClose} />

      <div className="animate-slide-up relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Training Job</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer bg-transparent border-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0a0a0a] rounded-xl mb-6">
          <button
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border-none ${
              tab === 'manual'
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
            onClick={() => setTab('manual')}
          >
            Manual Training
          </button>
          <button
            className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border-none ${
              tab === 'auto'
                ? 'bg-indigo-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white'
            }`}
            onClick={() => setTab('auto')}
          >
            Auto Training
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* File Upload */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Dataset File</label>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                file
                  ? 'border-indigo-500/50 bg-indigo-500/5'
                  : 'border-white/10 hover:border-white/20 bg-[#0a0a0a]'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileDrop}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-2 justify-center text-indigo-400">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium text-sm">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Drop CSV or Excel file here, or <span className="text-indigo-400 font-medium">browse</span>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Target Column */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" htmlFor="target_col">Target Column</label>
            <input
              id="target_col"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200"
              placeholder="e.g. price, label, category"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              required
            />
          </div>

          {/* Problem Type */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Problem Type</label>
            <div className="flex gap-1 p-1 bg-[#0a0a0a] rounded-xl">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border-none ${
                  isClassification
                    ? 'bg-indigo-600 text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
                onClick={() => handleProblemTypeChange(true)}
              >
                Classification
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border-none ${
                  !isClassification
                    ? 'bg-indigo-600 text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
                onClick={() => handleProblemTypeChange(false)}
              >
                Regression
              </button>
            </div>
          </div>

          {/* Model Name (manual only) */}
          {tab === 'manual' && (
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" htmlFor="model_name">Model</label>
              <select
                id="model_name"
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 cursor-pointer appearance-none"
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
            <div className="mb-5 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-3 items-start">
              <Zap className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-300 leading-relaxed">
                Optuna will automatically select the best model and tune hyperparameters for you.
              </p>
            </div>
          )}

          {/* Intensity */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2" htmlFor="intensity">Training Intensity</label>
            <select
              id="intensity"
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all duration-200 cursor-pointer appearance-none"
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
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none text-sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4" />
                {tab === 'manual' ? 'Start Training' : 'Start Auto Training'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

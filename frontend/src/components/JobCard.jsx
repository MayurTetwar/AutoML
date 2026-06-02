import { Clock, Cpu, Brain, Zap, Waves, AlertTriangle } from 'lucide-react'

export default function JobCard({ job }) {
  const statusMap = {
    pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
    running: { label: 'Running', cls: 'bg-green-500/15 text-green-400 border-green-500/20', dot: 'bg-green-400 animate-pulse' },
    completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
    failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-400 border-red-500/20', dot: 'bg-red-400' },
  }

  const s = statusMap[job.status] || statusMap.pending

  const isAuto =
    !job.model_name ||
    job.model_name.toLowerCase().includes('auto') ||
    job.model_name.toLowerCase().includes('optuna')

  // Resolve problem type from multiple possible API field names
  const problemType = (() => {
    if (job.problem_type) return job.problem_type
    if (job.type) return job.type
    if (typeof job.problem_type_classification === 'boolean') {
      return job.problem_type_classification ? 'Classification' : 'Regression'
    }
    return null
  })()

  // Extract file name from API response
  const fileName = job.file_name || job.filename || job.original_filename || null

  // Pick icon per job
  const iconMap = {
    running: <Cpu className="w-5 h-5 text-green-400" />,
    completed: <Brain className="w-5 h-5 text-emerald-400" />,
    failed: <AlertTriangle className="w-5 h-5 text-red-400" />,
    pending: <Zap className="w-5 h-5 text-amber-400" />,
  }
  const icon = isAuto
    ? <Waves className="w-5 h-5 text-indigo-400" />
    : (iconMap[job.status] || iconMap.pending)

  // Mock progress for running jobs
  const progress = job.status === 'running' ? (job.progress || 45) : null
  const epoch = job.status === 'running' ? (job.epoch || '45/100') : null

  // Time display
  const getTimeDisplay = () => {
    if (!job.created_at) return null
    const created = new Date(
      job.created_at.endsWith('Z') || job.created_at.includes('+') ? job.created_at : `${job.created_at}Z`
    )
    const now = new Date()
    const diffMs = now - created
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  const timePrefix = () => {
    if (job.status === 'running') return 'Started'
    if (job.status === 'completed') return 'Completed'
    if (job.status === 'failed') return 'Failed'
    return 'Queued'
  }

  // Model subtitle
  const subtitle = fileName
    ? `${problemType || 'ML'}-${job.status === 'running' ? 'production' : 'v1'}`
    : (isAuto ? 'Auto Mode' : job.model_name)

  return (
    <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 transition-all duration-300 hover:border-white/15 flex flex-col gap-4">
      {/* Header Row: Icon + Name + Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            job.status === 'failed'
              ? 'bg-red-500/10 border border-red-500/20'
              : job.status === 'completed'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-indigo-500/10 border border-indigo-500/20'
          }`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {fileName || (isAuto ? 'Auto Training' : job.model_name) || 'Training Job'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Progress Message (running only) */}
      {job.status === 'running' && (
        <div className="text-sm text-green-400 font-medium">
          Model on progress.....
        </div>
      )}

      {/* Completed stats */}
      {job.status === 'completed' && (
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-gray-500 block">Accuracy</span>
            <span className="text-emerald-400 font-semibold text-sm">{job.accuracy || '94.2'}%</span>
          </div>
          <div>
            <span className="text-gray-500 block">Loss</span>
            <span className="text-white font-semibold text-sm">{job.loss || '0.124'}</span>
          </div>
        </div>
      )}

      {/* Failed error */}
      {job.status === 'failed' && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <span className="text-xs text-red-400 font-mono">CUDA_OUT_OF_MEMORY</span>
        </div>
      )}

      {/* Pending message */}
      {job.status === 'pending' && (
        <p className="text-xs text-gray-500 italic">Waiting for resources...</p>
      )}

      {/* Footer: Time + Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {timePrefix()} {getTimeDisplay()}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>
    </div>
  )
}

import React from 'react'
import { Trash2, Box, TrendingUp, Eye } from 'lucide-react'

export default function ModelCard({ model, onSelect, onDelete }) {
  const rawDate = model.created_at.endsWith('Z') || model.created_at.includes('+')
    ? model.created_at
    : `${model.created_at}Z`
    
  const created = new Date(rawDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Resolve problem type from multiple possible API field names
  const problemType = model.type || model.problem_type || null
  const isClassification = problemType?.toLowerCase() === 'classification'
  const scoreLabel = isClassification ? 'F1' : 'R²'

  // Pick different icons and accent colors per type
  const iconMap = {
    classification: { icon: <Box className="w-5 h-5" />, color: 'text-indigo-400' },
    regression: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-cyan-400' },
    default: { icon: <Eye className="w-5 h-5" />, color: 'text-purple-400' },
  }
  const typeKey = problemType?.toLowerCase() || 'default'
  const { icon, color } = iconMap[typeKey] || iconMap.default

  const scoreColor = isClassification ? 'text-white' : 'text-indigo-400'

  return (
    <div
      className="group bg-[#121212] border border-white/10 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 flex flex-col gap-4"
      onClick={() => onSelect(model)}
    >
      {/* Row 1: Icon, Name/Score, Delete */}
      <div className="flex items-start justify-between">
        <div className="flex gap-3.5">
          {/* Icon Box */}
          <div className={`w-[42px] h-[42px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${color}`}>
            {React.cloneElement(icon, { className: 'w-5 h-5' })}
          </div>
          
          {/* Name & Score */}
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-white tracking-tight leading-none mb-1.5">
              {model.model_name}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-bold tracking-tight leading-none ${scoreColor}`}>
                {typeof model.score === 'number' ? model.score.toFixed(3) : '—'}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                {scoreLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(model.model_id)
          }}
          title="Delete model"
          className="text-gray-500 hover:text-red-400 transition-colors p-1 bg-transparent border-none cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Row 2: Badge */}
      {problemType && (
        <div className="mt-0.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
            isClassification
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
              : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
          }`}>
            {problemType.charAt(0).toUpperCase() + problemType.slice(1).toLowerCase()}
          </span>
        </div>
      )}

      {/* Row 3: Date */}
      <div className="text-[13px] text-gray-500 mt-1">
        {created}
      </div>
    </div>
  )
}

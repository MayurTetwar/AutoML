export default function ModelCard({ model, onSelect, onDelete }) {
  const rawDate = model.created_at.endsWith('Z') || model.created_at.includes('+') 
    ? model.created_at 
    : `${model.created_at}Z`
  const created = new Date(rawDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  // Resolve problem type from multiple possible API field names
  const problemType = model.type || model.problem_type || null
  const isClassification =
    problemType?.toLowerCase() === 'classification'

  const scoreLabel = isClassification ? 'Accuracy' : 'R²'

  return (
    <div
      className="card card-hover"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
      onClick={() => onSelect(model)}
    >
      {/* Row 1: Icon + Model Name + Delete */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1.4rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, var(--accent), rgba(100, 68, 213, 0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>

        {/* Name + Score */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: '1.0625rem',
              fontWeight: 600,
              color: 'var(--foreground)',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {model.model_name}
          </h3>
          {/* Score directly below model name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.25rem',
              marginTop: '0.125rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
              {typeof model.score === 'number' ? model.score.toFixed(2) : '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{scoreLabel}</span>
          </div>
        </div>

        {/* Delete icon */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(model.model_id)
          }}
          title="Delete model"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--secondary)',
            padding: '0.25rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--destructive)'
            e.currentTarget.style.background = 'rgb(254 226 226)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--secondary)'
            e.currentTarget.style.background = 'none'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* Problem type badge — own line, left aligned */}
      {problemType && (
        <span
          className={`badge ${isClassification ? 'badge-classification' : 'badge-regression'}`}
          style={{ alignSelf: 'flex-start' }}
        >
          {problemType}
        </span>
      )}

      {/* Date — last line, left aligned */}
      <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: 'auto' }}>
        {created}
      </p>
    </div>
  )
}

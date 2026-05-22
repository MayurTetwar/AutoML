export default function JobCard({ job }) {
  const statusMap = {
    pending: { emoji: '🟡', label: 'Pending', cls: 'badge-pending' },
    running: { emoji: '🔵', label: 'Running', cls: 'badge-running' },
    completed: { emoji: '🟢', label: 'Completed', cls: 'badge-completed' },
    failed: { emoji: '🔴', label: 'Failed', cls: 'badge-failed' },
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

  return (
    <div
      className="card animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        marginBottom: '0.75rem',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '0.75rem',
            background: isAuto
              ? 'linear-gradient(135deg, var(--primary), var(--ring))'
              : 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isAuto ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {/* File name + Model name */}
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.9375rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {fileName && (
              <>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'var(--primary)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {fileName}
                </span>
                <span style={{ color: 'var(--border)' }}>•</span>
              </>
            )}
            <span>{isAuto ? 'Auto Mode' : job.model_name}</span>
          </div>

          {/* Badges and Created At */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
            {/* Problem type badge */}
            {problemType && (
              <span
                className={`badge ${
                  problemType.toLowerCase() === 'classification'
                    ? 'badge-classification'
                    : 'badge-regression'
                }`}
              >
                {problemType}
              </span>
            )}
            
            {/* Created At */}
            {job.created_at && (
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {new Date(job.created_at.endsWith('Z') || job.created_at.includes('+') ? job.created_at : `${job.created_at}Z`).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right — Status */}
      <span className={`badge ${s.cls}`}>
        {s.emoji} {s.label}
      </span>
    </div>
  )
}

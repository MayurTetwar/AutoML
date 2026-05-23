import { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import JobCard from '../components/JobCard'
import ModelCard from '../components/ModelCard'
import ModelDetailPanel from '../components/ModelDetailPanel'
import TrainModal from '../components/TrainModal'
import ApiKeysPanel from '../components/ApiKeysPanel'
import QuickStartGuide from '../components/QuickStartGuide'
import { getJobs, getJobStatus, getModels, deleteModel } from '../api'

const SIDEBAR_ITEMS = [
  {
    key: 'jobs',
    label: 'Training Jobs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    key: 'models',
    label: 'My Models',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    key: 'api-keys',
    label: 'API Keys',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    key: 'quick-start',
    label: 'Quick Start',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [jobs, setJobs] = useState([])
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [showTrainModal, setShowTrainModal] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingModels, setLoadingModels] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile toggle
  const pollingRef = useRef({})

  /* ——— Fetch jobs ——— */
  const fetchJobs = useCallback(async () => {
    try {
      const data = await getJobs()
      setJobs(data.jobs || [])
    } catch {
      /* ignore */
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  /* ——— Fetch models ——— */
  const fetchModels = useCallback(async () => {
    try {
      const data = await getModels()
      setModels(data.models || [])
    } catch {
      /* ignore */
    } finally {
      setLoadingModels(false)
    }
  }, [])

  /* ——— Initial fetch ——— */
  useEffect(() => {
    fetchJobs()
    fetchModels()
  }, [fetchJobs, fetchModels])

  /* ——— Polling for active jobs ——— */
  useEffect(() => {
    const activeJobs = jobs.filter(
      (j) => j.status === 'pending' || j.status === 'running'
    )

    // Clear intervals for jobs that are no longer active
    Object.keys(pollingRef.current).forEach((id) => {
      if (!activeJobs.find((j) => j.job_id === id)) {
        clearInterval(pollingRef.current[id])
        delete pollingRef.current[id]
      }
    })

    // Start intervals for newly active jobs
    activeJobs.forEach((job) => {
      if (pollingRef.current[job.job_id]) return // already polling

      pollingRef.current[job.job_id] = setInterval(async () => {
        try {
          const status = await getJobStatus(job.job_id)
          setJobs((prev) =>
            prev.map((j) =>
              j.job_id === job.job_id ? { ...j, status: status.status } : j
            )
          )

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollingRef.current[job.job_id])
            delete pollingRef.current[job.job_id]
            if (status.status === 'completed') {
              fetchModels()
            }
          }
        } catch {
          /* ignore */
        }
      }, 5000)
    })
    // Do NOT return a cleanup function here that clears all intervals,
    // otherwise intervals get destroyed on every `jobs` state update.
  }, [jobs, fetchModels])

  // Cleanup all polling intervals on component unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval)
    }
  }, [])

  /* ——— Handlers ——— */
  function handleJobCreated(data) {
    const newJob = {
      job_id: data.job_id,
      model_name: data.model_name,
      status: data.status || 'pending',
      problem_type_classification: true,
    }
    setJobs((prev) => [newJob, ...prev])
  }

  async function handleDeleteModel(modelId) {
    if (!confirm('Are you sure you want to delete this model?')) return
    try {
      await deleteModel(modelId)
      setModels((prev) => prev.filter((m) => m.model_id !== modelId))
    } catch {
      alert('Failed to delete model')
    }
  }

  function handleModelDeleted(modelId) {
    setModels((prev) => prev.filter((m) => m.model_id !== modelId))
  }

  // Count active (pending/running) jobs for badge
  const activeJobCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'running'
  ).length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* ——— Sidebar ——— */}

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="backdrop"
            style={{ zIndex: 15 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          style={{
            width: '16rem',
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--card)',
            padding: '1.5rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            position: 'sticky',
            top: '4rem',
            height: 'calc(100vh - 4rem)',
            overflowY: 'auto',
            zIndex: 20,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className="sidebar-desktop"
        >
          {/* Sidebar heading */}
          <div
            style={{
              padding: '0 1.25rem',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--secondary)',
              }}
            >
              Navigation
            </span>
          </div>

          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key)
                  setSidebarOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  margin: '0 0.75rem',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--secondary)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  fontFamily: 'var(--font-sans)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--muted)'
                    e.currentTarget.style.color = 'var(--foreground)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--secondary)'
                  }
                }}
              >
                {item.icon}
                {item.label}

                {/* Badge for active jobs */}
                {item.key === 'jobs' && activeJobCount > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      minWidth: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    {activeJobCount}
                  </span>
                )}

                {/* Badge for model count */}
                {item.key === 'models' && models.length > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--border)',
                      color: 'var(--foreground)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      minWidth: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    {models.length}
                  </span>
                )}
              </button>
            )
          })}
        </aside>

        {/* ——— Mobile sidebar toggle button ——— */}
        <button
          className="sidebar-mobile-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '1.5rem',
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            zIndex: 25,
            display: 'none', // shown via CSS media query
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(100, 68, 213, 0.4)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Mobile sidebar overlay panel */}
        {sidebarOpen && (
          <aside
            className="animate-slide-right"
            style={{
              position: 'fixed',
              top: '4rem',
              left: 0,
              width: '16rem',
              height: 'calc(100vh - 4rem)',
              borderRight: '1px solid var(--border)',
              background: 'var(--card)',
              padding: '1.5rem 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              zIndex: 20,
              overflowY: 'auto',
              animation: 'slide-in-left 0.3s ease-out forwards',
            }}
          >
            <div style={{ padding: '0 1.25rem', marginBottom: '1rem' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--secondary)',
                }}
              >
                Navigation
              </span>
            </div>

            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key)
                    setSidebarOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.25rem',
                    margin: '0 0.75rem',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {item.icon}
                  {item.label}
                  {item.key === 'jobs' && activeJobCount > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: 'var(--primary)',
                        color: '#fff',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {activeJobCount}
                    </span>
                  )}
                  {item.key === 'models' && models.length > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        background: 'var(--border)',
                        color: 'var(--foreground)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {models.length}
                    </span>
                  )}
                </button>
              )
            })}
          </aside>
        )}

        {/* ——— Main Content ——— */}
        <main style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0, maxWidth: '1000px' }}>

          {/* === Training Jobs View === */}
          {activeTab === 'jobs' && (
            <section className="animate-fade-in">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Training Jobs</h1>
                  <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                    Start a new training job or monitor existing ones
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowTrainModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Training Job
                </button>
              </div>

              {loadingJobs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
                </div>
              ) : jobs.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: 'var(--secondary)',
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 1rem' }}
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '1.0625rem' }}>No training jobs yet</p>
                  <p style={{ fontSize: '0.8125rem' }}>
                    Click "New Training Job" to train your first model
                  </p>
                </div>
              ) : (
                <div>
                  {jobs.map((job) => (
                    <JobCard key={job.job_id} job={job} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* === My Models View === */}
          {activeTab === 'models' && (
            <section className="animate-fade-in">
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Models</h1>
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
                  Click a model to view details and get the prediction API
                </p>
              </div>

              {loadingModels ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                  <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
                </div>
              ) : models.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: 'var(--secondary)',
                  }}
                >
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 1rem' }}
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  <p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '1.0625rem' }}>No models yet</p>
                  <p style={{ fontSize: '0.8125rem' }}>
                    Train a model and it will appear here once completed
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(18rem, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {models.map((m) => (
                    <ModelCard
                      key={m.model_id}
                      model={m}
                      onSelect={setSelectedModel}
                      onDelete={handleDeleteModel}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* === API Keys View === */}
          {activeTab === 'api-keys' && <ApiKeysPanel />}

          {/* === Quick Start Guide View === */}
          {activeTab === 'quick-start' && <QuickStartGuide />}
        </main>
      </div>

      {/* Modals */}
      {showTrainModal && (
        <TrainModal
          onClose={() => setShowTrainModal(false)}
          onCreated={handleJobCreated}
        />
      )}

      {selectedModel && (
        <ModelDetailPanel
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onDeleted={handleModelDeleted}
        />
      )}
    </div>
  )
}

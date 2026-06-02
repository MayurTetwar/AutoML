import { useState, useEffect, useRef, useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import JobCard from '../components/JobCard'
import ModelCard from '../components/ModelCard'
import ModelDetailPanel from '../components/ModelDetailPanel'
import TrainModal from '../components/TrainModal'
import ApiKeysPanel from '../components/ApiKeysPanel'
import QuickStartGuide from '../components/QuickStartGuide'
import { getJobs, getJobStatus, getModels, deleteModel, logout, deleteAccount } from '../api'
import { AuthContext } from '../App'
import {
  Briefcase, Box, KeyRound, BookOpen, Plus, Settings,
  Search, Menu, X, User, LogOut, Trash2,
  Filter, ArrowUpDown, ChevronRight
} from 'lucide-react'

const SIDEBAR_ITEMS = [
  { key: 'jobs', label: 'Training Jobs', icon: Briefcase },
  { key: 'models', label: 'My Models', icon: Box },
  { key: 'api-keys', label: 'API Keys', icon: KeyRound },
  { key: 'quick-start', label: 'Quick Start', icon: BookOpen },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('jobs')
  const [jobs, setJobs] = useState([])
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [showTrainModal, setShowTrainModal] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingModels, setLoadingModels] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pollingRef = useRef({})
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const { setIsAuth } = useContext(AuthContext)

  /* ——— Dropdown outside click ——— */
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  /* ——— Auth handlers ——— */
  async function handleSignOut() {
    try { await logout() } catch { /* ignore */ }
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    setIsAuth(false)
    navigate('/')
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure you want to permanently delete your account?")) return
    try {
      await deleteAccount()
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_id')
      setIsAuth(false)
      navigate('/')
    } catch (err) {
      alert("Failed: " + err.message)
    }
  }

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

    Object.keys(pollingRef.current).forEach((id) => {
      if (!activeJobs.find((j) => j.job_id === id)) {
        clearInterval(pollingRef.current[id])
        delete pollingRef.current[id]
      }
    })

    activeJobs.forEach((job) => {
      if (pollingRef.current[job.job_id]) return

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
  }, [jobs, fetchModels])

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

  const activeJobCount = jobs.filter(
    (j) => j.status === 'pending' || j.status === 'running'
  ).length

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {/* Top Bar (Full Width) */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between h-16 px-6">
          {/* Logo and Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer bg-transparent border-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div 
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">AutoML.ai</h2>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTrainModal(true)}
              className="hidden sm:flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer border-none"
            >
              Training Models
            </button>

            {/* User avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-white/10 flex items-center justify-center hover:bg-white/5 transition-all duration-200 cursor-pointer"
              >
                <User className="w-4 h-4 text-gray-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl min-w-[180px] overflow-hidden z-50 animate-fade-in">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all duration-200 cursor-pointer bg-transparent border-none text-left border-b border-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 cursor-pointer bg-transparent border-none text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ——— Left Sidebar ——— */}
        <aside
          className={`fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            <div className="px-3 mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NAVIGATION</span>
            </div>
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.key
            const Icon = item.icon
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border-none ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 shadow-sm shadow-indigo-500/10'
                    : 'bg-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}

                {item.key === 'jobs' && activeJobCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-[1.25rem] text-center">
                    {activeJobCount}
                  </span>
                )}
                {item.key === 'models' && models.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-white/10 text-gray-400 rounded-full min-w-[1.25rem] text-center">
                    {models.length}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="px-3 pb-4 space-y-1 border-t border-white/5 pt-3 mt-auto">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/5 hover:text-gray-400 transition-all duration-200 cursor-pointer bg-transparent border-none font-medium">
            <BookOpen className="w-[18px] h-[18px]" />
            Support
          </button>
        </div>
      </aside>

      {/* ——— Main Area ——— */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px]">

          {/* === Training Jobs View === */}
          {activeTab === 'jobs' && (
            <section className="animate-fade-in">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Training Jobs</h1>
                  <p className="text-sm text-gray-400">
                    Monitor and manage your active and past model training runs.
                  </p>
                </div>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer border-none"
                  onClick={() => setShowTrainModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  New Training Job
                </button>
              </div>

              {loadingJobs ? (
                <div className="flex justify-center py-12">
                  <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
                </div>
              ) : jobs.length === 0 ? (
                <div className="bg-[#121212] border border-white/10 rounded-2xl text-center py-16 px-6">
                  <Briefcase className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-white font-medium text-lg mb-1">No training jobs yet</p>
                  <p className="text-gray-500 text-sm">Click "New Training Job" to train your first model</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">My Models</h1>
                  <p className="text-sm text-gray-400">
                    Click a model to view details and get the prediction API
                  </p>
                </div>
              </div>

              {loadingModels ? (
                <div className="flex justify-center py-12">
                  <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
                </div>
              ) : models.length === 0 ? (
                <div className="bg-[#121212] border border-white/10 rounded-2xl text-center py-16 px-6">
                  <Box className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-white font-medium text-lg mb-1">No models yet</p>
                  <p className="text-gray-500 text-sm">Train a model and it will appear here once completed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  )
}

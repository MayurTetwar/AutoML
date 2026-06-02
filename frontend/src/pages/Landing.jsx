import { Link } from 'react-router-dom'
import { useContext, useState } from 'react'
import Navbar from '../components/Navbar'
import { AuthContext } from '../App'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  ArrowRight, Play, Zap, Box, Activity, Upload,
  Settings, Brain, Rocket, ChevronRight, Code, Terminal
} from 'lucide-react'

const features = [
  {
    icon: <Zap className="w-6 h-6 text-indigo-400" />,
    title: 'Auto Model Selection',
    desc: 'Optuna-powered hyperparameter search automatically finds the best model and configuration for your data.',
  },
  {
    icon: <Settings className="w-6 h-6 text-cyan-400" />,
    title: 'REST Prediction API',
    desc: 'Every trained model gets an instant REST API endpoint. Integrate predictions into any app with a simple POST call.',
  },
  {
    icon: <Activity className="w-6 h-6 text-emerald-400" />,
    title: 'Real-time Training Status',
    desc: 'Watch your models train in real time with live status updates and automatic notifications when training completes.',
  },
]

const steps = [
  { num: '01', title: 'Upload', desc: 'Upload your CSV or Excel dataset' },
  { num: '02', title: 'Configure', desc: 'Pick your target column and problem type' },
  { num: '03', title: 'Train', desc: 'Let AutoML train and optimize your model' },
  { num: '04', title: 'Predict', desc: 'Use the REST API to make predictions' },
]

const heroCode = `import requests

api_url = "https://api.automl.ai/v3/predict"
headers = {"Authorization": "Bearer YOUR_API_KEY"}
payload = {
    "model_id": "mdl_6x08c",
    "features": [5.1, 3.5, 1.4, 0.2]
}

response = requests.post(
    api_url,
    json=payload,
    headers=headers
)

print(response.json())
# Output: {"prediction": "setosa", "confidence": 0.96}`

export default function Landing() {
  const { isAuth } = useContext(AuthContext)

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden pt-8 pb-20 lg:pt-12 lg:pb-28">
        {/* Gradient blobs */}
        <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16">
          {/* Left text */}
          <div className="flex-1 max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6 animate-fade-in">
              Train ML Models in Minutes —{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                No Code Required
              </span>
            </h1>

            <p className="text-gray-400 text-base lg:text-lg leading-relaxed mb-8 max-w-lg animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
              Accelerate your machine learning pipeline. Automate model selection and hyperparameter tuning with Optuna, then deploy instantly via a secure REST API. Built for modern developers.
            </p>

            <div className="flex items-center gap-3 flex-wrap animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
              {isAuth ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 no-underline shadow-lg shadow-indigo-500/20"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 no-underline shadow-lg shadow-indigo-500/20"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <a
                href={`${import.meta.env.VITE_API_BASE_URL}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-white/10 text-gray-300 hover:text-white hover:border-white/20 font-medium rounded-xl transition-all duration-200 no-underline"
              >
                <Play className="w-4 h-4" />
                View API Docs
              </a>
            </div>
          </div>

          {/* Right code block */}
          <div className="flex-1 max-w-lg w-full animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <div className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-2xl glow-purple">
              {/* Title bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 font-mono">predict.py</span>
              </div>
              {/* Code */}
              <div className="syntax-block p-4 overflow-x-auto">
                <SyntaxHighlighter
                  language="python"
                  style={oneDark}
                  customStyle={{
                    background: 'transparent',
                    padding: 0,
                    margin: 0,
                    fontSize: '0.78rem',
                    lineHeight: '1.65',
                  }}
                  wrapLongLines
                >
                  {heroCode}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— How It Works ——— */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-12 text-sm">
            Four simple steps from raw data to production-ready predictions.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((s, i) => (
              <div
                key={i}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm font-mono">
                  {s.num}
                </div>
                <h3 className="font-semibold text-gray-100 text-base mb-1">{s.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Powerful Features ——— */}
      <section className="py-20 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
            Powerful Features
          </h2>
          <p className="text-gray-400 text-center mb-12 text-sm">
            Everything you need to go from raw data to production ML in one platform.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-[#18181b] border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-white/15 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-100 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— CTA ——— */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 text-center shadow-2xl shadow-indigo-500/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Ready to build your first model?
            </h2>
            <p className="text-indigo-200 mb-8 max-w-md mx-auto text-sm">
              Sign up for free and train your first machine learning model in under 5 minutes.
            </p>
            {isAuth ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-gray-100 text-indigo-600 font-semibold rounded-xl transition-all duration-200 no-underline shadow-lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-gray-100 text-indigo-600 font-semibold rounded-xl transition-all duration-200 no-underline shadow-lg"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ——— Footer ——— */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-base tracking-tight">AutoML API</span>
          </div>
          <div className="text-[13px] text-gray-500">
            © 2026 AutoML API. Built for developers who ship fast.
          </div>
        </div>
      </footer>
    </div>
  )
}

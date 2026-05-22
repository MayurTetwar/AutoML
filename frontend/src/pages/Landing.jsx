import { Link } from 'react-router-dom'
import { useContext } from 'react'
import Navbar from '../components/Navbar'
import { AuthContext } from '../App'

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    title: 'Auto Model Selection',
    desc: 'Optuna-powered hyperparameter search automatically finds the best model and configuration for your data.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'REST Prediction API',
    desc: 'Every trained model gets an instant REST API endpoint. Integrate predictions into any app with a simple POST call.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
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

export default function Landing() {
  const { isAuth, authLoading } = useContext(AuthContext)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          padding: '6rem 0 5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient blobs */}
        <div
          style={{
            position: 'absolute',
            top: '-8rem',
            right: '-6rem',
            width: '30rem',
            height: '30rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(100,68,213,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10rem',
            left: '-5rem',
            width: '25rem',
            height: '25rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234,223,251,0.5) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          {/* Badge */}
          <div
            className="animate-fade-in"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 1rem',
              borderRadius: '9999px',
              background: 'var(--accent)',
              border: '1px solid var(--ring)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--primary)',
              marginBottom: '2rem',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            No-Code Machine Learning Platform
          </div>

          <h1
            className="animate-fade-in"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              color: 'var(--foreground)',
              maxWidth: '48rem',
              margin: '0 auto 1.5rem',
              animationDelay: '0.1s',
              opacity: 0,
            }}
          >
            Train ML Models in Minutes —{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--ring))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              No Code Required
            </span>
          </h1>

          <p
            className="animate-fade-in"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--secondary)',
              maxWidth: '36rem',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
              animationDelay: '0.2s',
              opacity: 0,
            }}
          >
            Upload your CSV, auto-train the best model with Optuna, and get an
            instant REST API for predictions. Machine learning has never been
            this easy.
          </p>

          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              animationDelay: '0.3s',
              opacity: 0,
            }}
          >
            {isAuth ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <Link to="/signup" className="btn btn-primary btn-lg">
                Get Started Free
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            )}
            <a
              href={`${import.meta.env.VITE_API_BASE_URL}/docs`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-lg"
            >
              View API Docs
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--card)' }}>
        <div className="container">
          <h2
            style={{
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            How It Works
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--secondary)',
              marginBottom: '3rem',
              maxWidth: '32rem',
              margin: '0 auto 3rem',
            }}
          >
            Four simple steps from raw data to production-ready predictions.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
              gap: '2rem',
            }}
          >
            {steps.map((s, i) => (
              <div
                key={i}
                className="animate-fade-in"
                style={{
                  textAlign: 'center',
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0,
                }}
              >
                <div
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '1rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--ring))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.num}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.375rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="container">
          <h2
            style={{
              textAlign: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            Powerful Features
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--secondary)',
              marginBottom: '3rem',
              maxWidth: '32rem',
              margin: '0 auto 3rem',
            }}
          >
            Everything you need to go from raw data to production ML in one platform.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
              gap: '1.5rem',
            }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="card card-hover animate-fade-in"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0,
                }}
              >
                <div
                  style={{
                    width: '3.5rem',
                    height: '3.5rem',
                    borderRadius: '1rem',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--secondary)', lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '5rem 0',
          background: 'linear-gradient(135deg, var(--primary), var(--ring))',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '1rem',
            }}
          >
            Ready to build your first model?
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '2rem',
              maxWidth: '28rem',
              margin: '0 auto 2rem',
            }}
          >
            Sign up for free and train your first machine learning model in under 5 minutes.
          </p>
          {isAuth ? (
            <Link
              to="/dashboard"
              className="btn btn-lg"
              style={{
                background: '#fff',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Go to Dashboard
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ) : (
            <Link
              to="/signup"
              className="btn btn-lg"
              style={{
                background: '#fff',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Get Started Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '2rem 0',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--secondary)',
          fontSize: '0.8125rem',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '0.375rem',
                background: 'linear-gradient(135deg, var(--primary), var(--ring))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>AutoML API</span>
          </div>
          <p>© {new Date().getFullYear()} AutoML API. Built for developers who ship fast.</p>
        </div>
      </footer>
    </div>
  )
}

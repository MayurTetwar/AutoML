import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL

/* ── Tabbed Code Snippet Component ── */
function CodeTabs({ tabs, defaultTab }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key)
  const [copiedTab, setCopiedTab] = useState(null)

  function handleCopy(code) {
    navigator.clipboard.writeText(code)
    setCopiedTab(active)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const current = tabs.find((t) => t.key === active)

  return (
    <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--muted)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            style={{
              padding: '0.5rem 1.125rem',
              border: 'none',
              borderBottom: active === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: active === tab.key ? 'var(--card)' : 'transparent',
              color: active === tab.key ? 'var(--primary)' : 'var(--secondary)',
              fontWeight: active === tab.key ? 600 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {tab.icon && <span style={{ display: 'flex' }}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Code body */}
      {current && (
        <div className="code-block" style={{ borderRadius: 0, border: 'none', margin: 0, fontSize: '0.78rem', lineHeight: 1.7 }}>
          <button className="copy-btn" onClick={() => handleCopy(current.code)}>
            {copiedTab === active ? '✓ Copied!' : 'Copy'}
          </button>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {current.code}
          </pre>
        </div>
      )}
    </div>
  )
}


export default function QuickStartGuide() {
  const keyPlaceholder = 'sk-your-api-key-here'

  const pythonSnippet = `import requests

API_KEY = "${keyPlaceholder}"
MODEL_ID = "your-model-id"    # from My Models tab
API_URL = f"${API_BASE}/models/{MODEL_ID}/predict"

# Step 1: Check what features the model expects
features_url = f"${API_BASE}/models/{MODEL_ID}/features"
resp = requests.get(features_url, headers={"X-API-Key": API_KEY})
print("Expected features:", resp.json())

# Step 2: Make a prediction
response = requests.post(
    API_URL,
    headers={
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
    },
    json={
        "feature1": "value1",
        "feature2": "value2",
        # ... add all features from Step 1
    },
)

result = response.json()
print(f"Prediction: {result['prediction']}")
`

  const javascriptSnippet = `const API_KEY = "${keyPlaceholder}";
const MODEL_ID = "your-model-id";    // from My Models tab

// Make a prediction
const response = await fetch(
  \`${API_BASE}/models/\${MODEL_ID}/predict\`,
  {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      feature1: "value1",
      feature2: "value2",
      // ... add all features your model expects
    }),
  }
);

const result = await response.json();
console.log("Prediction:", result.prediction);
`

  const curlSnippet = `# Check expected features
curl ${API_BASE}/models/{model_id}/features \\
  -H "X-API-Key: ${keyPlaceholder}"

# Make a prediction
curl -X POST ${API_BASE}/models/{model_id}/predict \\
  -H "X-API-Key: ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "feature1": "value1",
    "feature2": "value2"
  }'
`

  const codeTabs = [
    {
      key: 'python',
      label: 'Python',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      code: pythonSnippet,
    },
    {
      key: 'javascript',
      label: 'JavaScript',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 16 4-4-4-4" />
          <path d="m6 8-4 4 4 4" />
          <path d="m14.5 4-5 16" />
        </svg>
      ),
      code: javascriptSnippet,
    },
    {
      key: 'curl',
      label: 'cURL',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      ),
      code: curlSnippet,
    },
  ]

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Quick Start Guide
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
          Use your API key to make predictions from any app, script, or service — no login needed.
        </p>
      </div>

      {/* How it works steps */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            {
              step: '1',
              title: 'Generate an API Key',
              desc: 'Go to the "API Keys" tab in the sidebar. Name your key and click Generate. Save it — it\'s shown only once.',
            },
            {
              step: '2',
              title: 'Get your Model ID',
              desc: 'Go to "My Models" tab → click a model → copy the model_id.',
            },
            {
              step: '3',
              title: 'Check expected features',
              desc: (
                <>
                  Call <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'var(--muted)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                    GET /models/{'{'}<span style={{color: 'var(--primary)'}}>model_id</span>{'}'}/features
                  </code> to see what inputs your model needs.
                </>
              ),
            },
            {
              step: '4',
              title: 'Make predictions!',
              desc: (
                <>
                  Send a <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'var(--muted)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>POST</code> request
                  with your features as JSON. The API key goes in the <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'var(--muted)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>X-API-Key</code> header.
                </>
              ),
            },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '0.125rem',
                }}
              >
                {item.step}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)', marginTop: '0.125rem', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code examples */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Code Examples
        </h3>
        <CodeTabs tabs={codeTabs} defaultTab="python" />
      </div>
    </section>
  )
}

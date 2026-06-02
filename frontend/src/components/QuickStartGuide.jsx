import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, BookOpen, Code, Terminal, Zap } from 'lucide-react'

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
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0d]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/10 bg-[#121212]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-all duration-200 cursor-pointer bg-transparent border-none ${
              active === tab.key
                ? 'text-indigo-400 border-b-2 border-indigo-500 -mb-px'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {/* Copy button */}
        {current && (
          <button
            onClick={() => handleCopy(current.code)}
            className="ml-auto mr-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer bg-transparent border-none"
          >
            {copiedTab === active ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* Code body */}
      {current && (
        <div className="syntax-block p-4 overflow-x-auto">
          <SyntaxHighlighter
            language={current.language || current.key}
            style={oneDark}
            customStyle={{
              background: 'transparent',
              padding: 0,
              margin: 0,
              fontSize: '0.8125rem',
              lineHeight: '1.7',
            }}
            wrapLongLines
          >
            {current.code}
          </SyntaxHighlighter>
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
      language: 'python',
      icon: <Code className="w-3.5 h-3.5" />,
      code: pythonSnippet,
    },
    {
      key: 'javascript',
      label: 'JavaScript',
      language: 'javascript',
      icon: <Zap className="w-3.5 h-3.5" />,
      code: javascriptSnippet,
    },
    {
      key: 'bash',
      label: 'cURL',
      language: 'bash',
      icon: <Terminal className="w-3.5 h-3.5" />,
      code: curlSnippet,
    },
  ]

  return (
    <section className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Quick Start Guide</h1>
        </div>
        <p className="text-sm text-gray-500">
          Use your API key to make predictions from any app, script, or service — no login needed.
        </p>
      </div>

      {/* How it works steps */}
      <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">How it works</h3>
        <div className="space-y-5">
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
              desc: 'Call GET /models/{model_id}/features to see what inputs your model needs.',
            },
            {
              step: '4',
              title: 'Make predictions!',
              desc: 'Send a POST request with your features as JSON. The API key goes in the X-API-Key header.',
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code examples */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Code Examples
        </h3>
        <CodeTabs tabs={codeTabs} defaultTab="python" />
      </div>
    </section>
  )
}

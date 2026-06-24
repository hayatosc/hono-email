/** @jsxImportSource hono/jsx/dom */
import { render, useState, useEffect, useCallback, useRef } from 'hono/jsx/dom'

// Apply theme before first paint to avoid flash
{
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const initial = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', initial)
}

type TemplateSummary = { name: string }
import type { PropsSchema } from '../props/index.js'
import { PreviewPanel } from './components/PreviewPanel.js'
import { PropsForm } from './components/PropsForm.js'
import { TemplateList } from './components/TemplateList.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function coerceSchema(raw: Record<string, unknown>): PropsSchema {
  const schema: PropsSchema = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!isObject(value)) continue
    schema[key] = {
      type:
        value.type === 'number' ||
        value.type === 'boolean' ||
        value.type === 'select' ||
        value.type === 'array'
          ? value.type
          : 'string',
      required: value.required === true,
      ...(value.defaultValue !== undefined ? { defaultValue: value.defaultValue } : {}),
      ...(Array.isArray(value.options) ? { options: value.options.map(String) } : {}),
      ...(value.multiline === true ? { multiline: true } : {}),
      ...(isObject(value.item) ? { item: coerceSchema(value.item) } : {}),
    }
  }
  return schema
}

function App() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [schema, setSchema] = useState<PropsSchema>({})
  const [propValues, setPropValues] = useState<Record<string, unknown>>({})
  const [tab, setTab] = useState<'html' | 'text'>('html')
  const [mobile, setMobile] = useState(false)
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [html, setHtml] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [warningsOpen, setWarningsOpen] = useState(true)
  const [jsonValue, setJsonValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const t = document.documentElement.getAttribute('data-theme')
    return t === 'light' ? 'light' : 'dark'
  })

  const debounceRef = useRef<number | null>(null)
  const renderRef = useRef<() => void>(() => {})

  const fetchApi = useCallback(async (path: string, opts?: RequestInit) => {
    try {
      return await fetch(path, opts)
    } catch (e) {
      console.error(e)
      return null
    }
  }, [])

  const renderTemplate = useCallback(async () => {
    if (!selected) return
    setError(null)
    const response = await fetchApi(`/api/templates/${encodeURIComponent(selected)}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: propValues }),
    })
    if (!response || !response.ok) {
      setError(response ? await response.text() : 'Network error')
      return
    }
    const data = await response.json()
    if (!isObject(data)) return
    setHtml(typeof data.html === 'string' ? data.html : '')
    setText(typeof data.text === 'string' ? data.text : '')
    setWarnings(Array.isArray(data.warnings) ? data.warnings.map(String) : [])
  }, [selected, propValues, fetchApi])

  renderRef.current = renderTemplate

  const scheduleRender = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => renderRef.current?.(), 300)
  }, [])

  const loadSchema = useCallback(
    async (name: string) => {
      const response = await fetchApi(`/api/templates/${encodeURIComponent(name)}/props`)
      if (!response || !response.ok) return
      const newSchema = await response.json()
      if (!isObject(newSchema)) return
      const schema = coerceSchema(newSchema)
      setSchema(schema)
      const defaults: Record<string, unknown> = {}
      for (const [key, spec] of Object.entries(schema)) {
        if (spec.defaultValue !== undefined) defaults[key] = spec.defaultValue
        else if (spec.type === 'boolean') defaults[key] = false
        else if (spec.type === 'number') defaults[key] = 0
        else if (spec.type === 'array') defaults[key] = []
        else if (spec.type === 'select' && spec.options && spec.options.length > 0)
          defaults[key] = spec.options[0]
        else defaults[key] = ''
      }
      setPropValues(defaults)
    },
    [fetchApi],
  )

  const selectTemplate = useCallback(
    (name: string) => {
      setSelected(name)
      setMode('form')
      setJsonValue('')
      setJsonError(null)
      void loadSchema(name)
    },
    [loadSchema],
  )

  useEffect(() => {
    const load = async () => {
      const response = await fetchApi('/api/templates')
      if (!response || !response.ok) return
      const data = await response.json()
      const templates: TemplateSummary[] = Array.isArray(data)
        ? data
            .filter(isObject)
            .map((item) => ({
              name: typeof item.name === 'string' ? item.name : '',
            }))
            .filter((item) => item.name !== '')
        : []
      setTemplates(templates)
      const first = templates[0]
      if (first && !selected) {
        selectTemplate(first.name)
      }
    }
    void load()
  }, [])

  useEffect(() => {
    if (!selected) return
    scheduleRender()
  }, [selected, propValues, scheduleRender])
  useEffect(() => {
    const source = new EventSource('/__live')
    const handler = () => renderRef.current?.()
    source.addEventListener('message', handler)
    return () => source.close()
  }, [])

  const handlePropChange = useCallback((key: string, value: unknown) => {
    setPropValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      localStorage.setItem('theme', next)
      return next
    })
  }, [])

  const handleJsonChange = useCallback((value: string) => {
    setJsonValue(value)
    try {
      const parsed = JSON.parse(value)
      if (!isObject(parsed) || Array.isArray(parsed)) {
        setJsonError('JSON must be an object')
        return
      }
      setJsonError(null)
      setPropValues(parsed)
    } catch {
      setJsonError('Invalid JSON')
    }
  }, [])

  const switchMode = useCallback(
    (next: 'form' | 'json') => {
      setMode(next)
      if (next === 'json') {
        setJsonValue(JSON.stringify(propValues, null, 2))
      }
    },
    [propValues],
  )

  return (
    <>
      <div class="header">
        <h1 class="header-title">
          <span>hono-email</span> preview
        </h1>
        <button
          class="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
      <div class="layout">
        <div class="sidebar">
          <div class="sidebar-section">
            <h2 class="panel-title">Templates</h2>
            <TemplateList templates={templates} selected={selected} onSelect={selectTemplate} />
          </div>
          <PropsForm
            schema={schema}
            values={propValues}
            onChange={handlePropChange}
            mode={mode}
            onSwitchMode={switchMode}
            jsonValue={jsonValue}
            jsonError={jsonError}
            onJsonChange={handleJsonChange}
          />
        </div>
        <PreviewPanel
          tab={tab}
          onSwitchTab={setTab}
          mobile={mobile}
          onSetMobile={setMobile}
          html={html}
          text={text}
          error={error}
          warnings={warnings}
          warningsOpen={warningsOpen}
          onToggleWarnings={() => setWarningsOpen((v) => !v)}
        />
      </div>
    </>
  )
}

const appRoot = document.getElementById('app')
if (appRoot) {
  render(<App />, appRoot)
}

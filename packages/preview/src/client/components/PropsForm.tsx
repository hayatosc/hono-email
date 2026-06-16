/** @jsxImportSource hono/jsx/dom */
import type { PropsSchema } from '../../props/index.js'

export type PropsFormProps = {
  schema: PropsSchema
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  mode: 'form' | 'json'
  onSwitchMode: (mode: 'form' | 'json') => void
  jsonValue: string
  jsonError: string | null
  onJsonChange: (value: string) => void
}

function inputValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function asInputElement(target: EventTarget | null): HTMLInputElement | undefined {
  return target instanceof HTMLInputElement ? target : undefined
}

function asSelectElement(target: EventTarget | null): HTMLSelectElement | undefined {
  return target instanceof HTMLSelectElement ? target : undefined
}

function asTextAreaElement(target: EventTarget | null): HTMLTextAreaElement | undefined {
  return target instanceof HTMLTextAreaElement ? target : undefined
}

function Field({
  name,
  spec,
  value,
  onChange,
}: {
  name: string
  spec: PropsSchema[string]
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const label = (
    <>
      {name}
      {spec.required ? <span class="field-label-required"> *</span> : null}
    </>
  )

  if (spec.type === 'boolean') {
    return (
      <div class="field">
        <label class="checkbox-label">
          <input
            class="field-checkbox"
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              const el = asInputElement(e.currentTarget)
              if (el) onChange(name, el.checked)
            }}
          />
          {label}
        </label>
      </div>
    )
  }

  if (spec.type === 'select' && spec.options && spec.options.length > 0) {
    return (
      <div class="field">
        <label class="field-label">{label}</label>
        <select
          class="field-select"
          value={inputValue(value)}
          onChange={(e) => {
            const el = asSelectElement(e.currentTarget)
            if (el) onChange(name, el.value)
          }}
        >
          {spec.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (spec.type === 'number') {
    return (
      <div class="field">
        <label class="field-label">{label}</label>
        <input
          class="field-input"
          type="number"
          value={inputValue(value)}
          onInput={(e) => {
            const el = asInputElement(e.currentTarget)
            if (el && !Number.isNaN(el.valueAsNumber)) onChange(name, el.valueAsNumber)
          }}
        />
      </div>
    )
  }

  return (
    <div class="field">
      <label class="field-label">{label}</label>
      <input
        class="field-input"
        type="text"
        value={inputValue(value)}
        onInput={(e) => {
          const el = asInputElement(e.currentTarget)
          if (el) onChange(name, el.value)
        }}
      />
    </div>
  )
}

export function PropsForm({
  schema,
  values,
  onChange,
  mode,
  onSwitchMode,
  jsonValue,
  jsonError,
  onJsonChange,
}: PropsFormProps) {
  const hasSchema = Object.keys(schema).length > 0

  return (
    <div class="props-panel">
      <h2 class="panel-title">Props</h2>
      <div class="mode-toggle">
        <button
          class={'mode-btn' + (mode === 'form' ? ' active' : '')}
          onClick={() => onSwitchMode('form')}
        >
          Form
        </button>
        <button
          class={'mode-btn' + (mode === 'json' ? ' active' : '')}
          onClick={() => onSwitchMode('json')}
        >
          JSON
        </button>
      </div>

      <div class="props-form" style={{ display: mode === 'form' ? '' : 'none' }}>
        {hasSchema ? (
          Object.entries(schema).map(([key, spec]) => (
            <Field key={key} name={key} spec={spec} value={values[key]} onChange={onChange} />
          ))
        ) : (
          <div class="empty-state">No editable props</div>
        )}
      </div>

      <div class="props-form" style={{ display: mode === 'json' ? '' : 'none' }}>
        <textarea
          class="json-editor"
          value={jsonValue}
          onInput={(e) => {
            const el = asTextAreaElement(e.currentTarget)
            if (el) onJsonChange(el.value)
          }}
        />
        <div class="json-error" style={{ display: jsonError ? '' : 'none' }}>
          {jsonError}
        </div>
      </div>
    </div>
  )
}

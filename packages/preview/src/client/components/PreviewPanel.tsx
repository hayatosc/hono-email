/** @jsxImportSource hono/jsx/dom */
import type { HtmlEscapedString } from 'hono/utils/html'

export type PreviewPanelProps = {
  tab: 'html' | 'text'
  onSwitchTab: (tab: 'html' | 'text') => void
  mobile: boolean
  onSetMobile: (mobile: boolean) => void
  html: string
  text: string
  error: string | null
  warnings: string[]
  warningsOpen: boolean
  onToggleWarnings: () => void
}

export function PreviewPanel({
  tab,
  onSwitchTab,
  mobile,
  onSetMobile,
  html,
  text,
  error,
  warnings,
  warningsOpen,
  onToggleWarnings,
}: PreviewPanelProps): HtmlEscapedString | Promise<HtmlEscapedString> {
  const hasWarnings = warnings.length > 0

  return (
    <div class="preview-panel">
      <div class="preview-tabs">
        <button
          class={'tab-btn' + (tab === 'html' ? ' active' : '')}
          onClick={() => onSwitchTab('html')}
        >
          HTML
        </button>
        <button
          class={'tab-btn' + (tab === 'text' ? ' active' : '')}
          onClick={() => onSwitchTab('text')}
        >
          Plain Text
        </button>
        <div class="width-toggle" style={{ display: tab === 'html' ? '' : 'none' }}>
          <button
            class={'width-btn' + (!mobile ? ' active' : '')}
            onClick={() => onSetMobile(false)}
          >
            Desktop
          </button>
          <button class={'width-btn' + (mobile ? ' active' : '')} onClick={() => onSetMobile(true)}>
            Mobile
          </button>
        </div>
      </div>

      {error && <div class="preview-error">{error}</div>}

      <div
        class={'preview-content' + (mobile ? ' mobile' : '')}
        style={{ display: tab === 'html' ? '' : 'none' }}
      >
        {html ? (
          <iframe srcdoc={html} title="preview" sandbox="" />
        ) : (
          <div class="empty-state">No preview</div>
        )}
      </div>

      <pre class="text-content" style={{ display: tab === 'text' ? '' : 'none' }}>
        {text || 'No text content'}
      </pre>

      <div class="warnings-panel" style={{ display: hasWarnings ? '' : 'none' }}>
        <button
          type="button"
          class="warnings-header"
          onClick={onToggleWarnings}
          aria-expanded={warningsOpen}
        >
          <span>Warnings</span>
          <span class="warnings-badge">{warnings.length}</span>
          <span class="warnings-arrow">{warningsOpen ? '▾' : '▸'}</span>
        </button>
        <div class="warnings-list" style={{ display: warningsOpen ? '' : 'none' }}>
          {warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

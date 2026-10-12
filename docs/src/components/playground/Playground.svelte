<script lang="ts">
  import { onMount } from 'svelte'

  import type { PlaygroundResult } from './compile'
  import { DEFAULT_TEMPLATE } from './default-template'
  import { createEditor } from './editor'
  import type { PlaygroundRequest, PlaygroundResponse } from './playground.worker'
  import { decodeSourceFromHash, encodeSourceToHash } from './share'

  type Rendered = Extract<PlaygroundResult, { ok: true }>
  type Tab = 'preview' | 'html' | 'text' | 'warnings'

  const DEBOUNCE_MS = 300
  // Generous enough for the first render, which also loads the worker and its WASM.
  const RENDER_TIMEOUT_MS = 10_000
  // Gmail clips messages whose HTML is larger than this.
  const GMAIL_CLIP_BYTES = 102 * 1024

  let editorElement = $state<HTMLDivElement>()
  let source = DEFAULT_TEMPLATE
  let strict = $state(true)
  let tab = $state<Tab>('preview')
  let mobile = $state(false)
  let rendered = $state<Rendered>()
  let error = $state<string>()
  let rendering = $state(true)
  let copied = $state<'link' | 'output'>()

  let worker: Worker | undefined
  let requestId = 0
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let renderTimer: ReturnType<typeof setTimeout> | undefined

  const htmlBytes = $derived(rendered ? new Blob([rendered.html]).size : 0)

  function startWorker() {
    worker = new Worker(new URL('./playground.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (event: MessageEvent<PlaygroundResponse>) => {
      if (event.data.id !== requestId) return
      clearTimeout(renderTimer)
      rendering = false
      if (event.data.ok) {
        rendered = event.data
        error = undefined
      } else {
        error = event.data.error
      }
    })
    worker.addEventListener('error', (event) => {
      clearTimeout(renderTimer)
      rendering = false
      error = event.message || 'The playground failed to load.'
    })
  }

  function run() {
    if (!worker) return
    requestId += 1
    rendering = true
    clearTimeout(renderTimer)
    renderTimer = setTimeout(() => {
      // A render that never finishes (e.g. an infinite loop) blocks the worker,
      // so replace it rather than waiting.
      worker?.terminate()
      startWorker()
      rendering = false
      error = `Rendering was stopped after ${RENDER_TIMEOUT_MS / 1000}s. Check for infinite loops.`
    }, RENDER_TIMEOUT_MS)
    worker.postMessage({ id: requestId, source, options: { strict } } satisfies PlaygroundRequest)
  }

  function onSourceChange(next: string) {
    source = next
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      run()
      void encodeSourceToHash(source).then((hash) => history.replaceState(null, '', hash))
    }, DEBOUNCE_MS)
  }

  function toggleStrict() {
    strict = !strict
    run()
  }

  function flashCopied(kind: 'link' | 'output') {
    copied = kind
    setTimeout(() => {
      if (copied === kind) copied = undefined
    }, 1500)
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(
      new URL(await encodeSourceToHash(source), location.href).toString(),
    )
    flashCopied('link')
  }

  async function copyOutput() {
    if (!rendered) return
    await navigator.clipboard?.writeText(tab === 'text' ? rendered.text : rendered.prettyHtml)
    flashCopied('output')
  }

  function formatBytes(bytes: number) {
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
  }

  onMount(() => {
    let editor: ReturnType<typeof createEditor> | undefined
    let disposed = false

    void decodeSourceFromHash(location.hash).then((shared) => {
      if (disposed || !editorElement) return
      source = shared ?? DEFAULT_TEMPLATE
      editor = createEditor(editorElement, source, onSourceChange)
      startWorker()
      run()
    })

    return () => {
      disposed = true
      clearTimeout(debounceTimer)
      clearTimeout(renderTimer)
      editor?.destroy()
      worker?.terminate()
    }
  })
</script>

<div class="playground not-content">
  <section class="pane" aria-label="Editor">
    <header class="toolbar">
      <span class="label">email.tsx</span>
      <div class="actions">
        <label class="toggle" title="Validate HTML and CSS against email client support">
          <input type="checkbox" checked={strict} onchange={toggleStrict} />
          Strict mode
        </label>
        <button type="button" class="button" onclick={copyLink}>
          {copied === 'link' ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </header>
    <div class="editor" bind:this={editorElement}></div>
  </section>

  <section class="pane" aria-label="Output">
    <header class="toolbar">
      <div class="tabs" role="tablist">
        {#each [['preview', 'Preview'], ['html', 'HTML'], ['text', 'Text'], ['warnings', 'Warnings']] as const as [id, label] (id)}
          <button
            type="button"
            role="tab"
            class={['tab', tab === id && 'is-active']}
            aria-selected={tab === id}
            onclick={() => (tab = id)}
          >
            {label}
            {#if id === 'warnings' && rendered && rendered.warnings.length > 0}
              <span class="badge">{rendered.warnings.length}</span>
            {/if}
          </button>
        {/each}
      </div>
      <div class="actions">
        {#if tab === 'preview'}
          <button type="button" class="button" onclick={() => (mobile = !mobile)}>
            {mobile ? 'Desktop' : 'Mobile'}
          </button>
        {:else if tab === 'html' || tab === 'text'}
          <button type="button" class="button" onclick={copyOutput} disabled={!rendered}>
            {copied === 'output' ? 'Copied!' : 'Copy'}
          </button>
        {/if}
      </div>
    </header>

    <div class={['output', (rendering || error) && 'is-stale']}>
      {#if !rendered}
        <p class="placeholder">{error ? '' : 'Rendering…'}</p>
      {:else if tab === 'preview'}
        <div class={['frame', mobile && 'is-mobile']}>
          <iframe title="Email preview" sandbox="" srcdoc={rendered.html}></iframe>
        </div>
      {:else if tab === 'html'}
        <pre><code>{rendered.prettyHtml}</code></pre>
      {:else if tab === 'text'}
        <pre><code>{rendered.text}</code></pre>
      {:else if rendered.warnings.length === 0}
        <p class="placeholder">No warnings.</p>
      {:else}
        <ul class="warnings">
          {#each rendered.warnings as warning (warning)}
            <li>{warning}</li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if error}
      <pre class="error" role="alert">{error}</pre>
    {/if}

    <footer class="status">
      <span>{rendering ? 'Rendering…' : error ? 'Error' : 'Rendered'}</span>
      {#if rendered}
        <span class={[htmlBytes > GMAIL_CLIP_BYTES && 'is-warning']}>
          HTML {formatBytes(htmlBytes)}{htmlBytes > GMAIL_CLIP_BYTES ? ' — Gmail clips over 102 KB' : ''}
        </span>
      {/if}
    </footer>
  </section>
</div>

<style>
  .playground {
    --pg-syntax-keyword: hsl(18 90% 62%);
    --pg-syntax-string: hsl(95 45% 62%);
    --pg-syntax-number: hsl(35 90% 64%);
    --pg-syntax-comment: hsl(240 5% 50%);
    --pg-syntax-tag: hsl(200 75% 66%);
    --pg-syntax-attribute: hsl(270 60% 76%);
    --pg-syntax-function: hsl(48 85% 68%);
    --pg-syntax-invalid: hsl(0 80% 64%);
    --pg-active-line: hsl(240 5% 50% / 0.08);
    --pg-selection: hsl(240 5% 50% / 0.28);
    --pg-error: hsl(0 80% 64%);
    --pg-error-bg: hsl(0 80% 50% / 0.1);

    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    height: max(32rem, calc(100dvh - var(--sl-nav-height, 3.5rem) - 9rem));
  }

  :global(:root[data-theme='light']) .playground {
    --pg-syntax-keyword: hsl(18 85% 42%);
    --pg-syntax-string: hsl(120 50% 30%);
    --pg-syntax-number: hsl(30 90% 36%);
    --pg-syntax-comment: hsl(240 5% 50%);
    --pg-syntax-tag: hsl(205 80% 36%);
    --pg-syntax-attribute: hsl(270 50% 44%);
    --pg-syntax-function: hsl(40 90% 30%);
    --pg-syntax-invalid: hsl(0 75% 45%);
    --pg-error: hsl(0 75% 42%);
    --pg-error-bg: hsl(0 80% 50% / 0.08);
  }

  @media (max-width: 60rem) {
    .playground {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 28rem 32rem;
      height: auto;
    }
  }

  .pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border: 1px solid var(--sl-color-hairline);
    border-radius: 0.6rem;
    background: var(--sl-color-bg-inline-code);
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0.35rem 0.5rem 0.35rem 0.85rem;
    border-bottom: 1px solid var(--sl-color-hairline);
    font-size: 0.8125rem;
  }

  .label {
    font-family: var(--sl-font-mono);
    color: var(--sl-color-gray-2);
  }

  .actions,
  .tabs {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .tabs {
    margin-inline-start: -0.5rem;
  }

  .button,
  .tab {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 0.4rem;
    background: transparent;
    color: var(--sl-color-gray-2);
    font: inherit;
    cursor: pointer;
  }

  .button {
    border-color: var(--sl-color-hairline);
  }

  .button:hover:not(:disabled),
  .tab:hover {
    color: var(--sl-color-white);
    background: var(--sl-color-gray-6);
  }

  .button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .tab.is-active {
    color: var(--sl-color-white);
    background: var(--sl-color-gray-5);
  }

  .badge {
    min-width: 1.25rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: hsl(40 90% 50% / 0.2);
    color: var(--pg-syntax-function);
    font-size: 0.75rem;
    text-align: center;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--sl-color-gray-2);
    cursor: pointer;
  }

  .editor {
    flex: 1;
    min-height: 0;
  }

  .output {
    flex: 1;
    min-height: 0;
    overflow: auto;
    transition: opacity 0.15s;
  }

  .output.is-stale {
    opacity: 0.6;
  }

  .frame {
    height: 100%;
    background: #ffffff;
  }

  .frame.is-mobile {
    background: var(--sl-color-gray-6);
    padding: 1rem;
  }

  .frame iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    background: #ffffff;
  }

  .frame.is-mobile iframe {
    width: 375px;
    max-width: 100%;
    margin-inline: auto;
    border-radius: 0.5rem;
    box-shadow: 0 0 0 1px var(--sl-color-hairline);
  }

  pre {
    margin: 0;
    padding: 0.85rem;
    font-family: var(--sl-font-mono);
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--sl-color-gray-1);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .placeholder {
    margin: 0;
    padding: 1rem;
    color: var(--sl-color-gray-3);
  }

  .warnings {
    margin: 0;
    padding: 0.85rem 0.85rem 0.85rem 2rem;
    font-size: 0.875rem;
    color: var(--sl-color-gray-1);
  }

  .warnings li + li {
    margin-top: 0.5rem;
  }

  .error {
    max-height: 40%;
    overflow: auto;
    border-top: 1px solid var(--pg-error);
    background: var(--pg-error-bg);
    color: var(--pg-error);
  }

  .status {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    border-top: 1px solid var(--sl-color-hairline);
    font-size: 0.75rem;
    color: var(--sl-color-gray-3);
  }

  .status .is-warning {
    color: var(--pg-syntax-function);
  }
</style>

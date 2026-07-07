<script>
  let copied = $state(false);
  const command = 'npm i hono-email';

  function copy() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(command).then(() => {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1500);
    }).catch(() => {});
  }
</script>

<div class="install" role="group" aria-label="Install command">
  <span class="prompt" aria-hidden="true">$</span>
  <code class="cmd">{command}</code>
  <button class={['copy', copied && 'is-copied']} type="button" aria-label="Copy install command" onclick={copy}>
    {#if !copied}
      <svg class="ic-copy" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="1.4" d="M5.5 5.5v-2A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V9a1.5 1.5 0 0 1-1.5 1.5h-2M2 7.5A1.5 1.5 0 0 1 3.5 6H9a1.5 1.5 0 0 1 1.5 1.5V13A1.5 1.5 0 0 1 9 14.5H3.5A1.5 1.5 0 0 1 2 13z"/>
      </svg>
    {:else}
      <svg class="ic-check" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 8.5l3.5 3.5L13 4.5"/>
      </svg>
    {/if}
  </button>
</div>

<style>
  .install {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.55rem 0.5rem 0.85rem;
    border: 1px solid var(--sl-color-hairline);
    border-radius: 0.55rem;
    background: var(--sl-color-bg-inline-code);
    font-family: var(--sl-font-mono);
    font-size: 0.875rem;
  }
  .prompt {
    color: var(--lp-accent);
    user-select: none;
  }
  .cmd {
    color: var(--sl-color-gray-1);
  }
  .copy {
    display: inline-grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 0;
    border-radius: 0.4rem;
    background: transparent;
    color: var(--sl-color-gray-3);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }
  .copy:hover {
    background: var(--sl-color-gray-5);
    color: var(--sl-color-white);
  }
  .copy :global(svg) {
    grid-area: 1 / 1;
  }
  .is-copied {
    color: var(--lp-accent);
  }
  @media (max-width: 40rem) {
    .install {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>

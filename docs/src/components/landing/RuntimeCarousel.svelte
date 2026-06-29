<script>
  let { runtimes = [] } = $props();

  let active = $state(0);
  let prefersReducedMotion = $state(false);
  let isPaused = $state(false);

  let n = $derived(runtimes.length);

  function getPos(i, currentActive, total) {
    if (prefersReducedMotion) return 'static';
    const rel = (i - currentActive + total) % total;
    if (rel === 0) return 'active';
    if (rel === 1) return 'next';
    if (rel === total - 1) return 'prev';
    return 'hidden';
  }

  $effect(() => {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || n === 0 || isPaused) return;

    const interval = setInterval(() => {
      active = (active + 1) % n;
    }, 2600);

    return () => clearInterval(interval);
  });
</script>

<div
  class="stage"
  data-runtime-carousel
  tabindex="0"
  role="region"
  aria-label="Supported Runtimes Carousel"
  onmouseenter={() => isPaused = true}
  onmouseleave={() => isPaused = false}
  onfocusin={() => isPaused = true}
  onfocusout={() => isPaused = false}
>
  {#each runtimes as r, i (r.name)}
    <figure class="rt" data-pos={getPos(i, active, n)}>
      <svg class="rt-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={r.path} />
      </svg>
      <figcaption class="rt-meta">
        <span class="rt-name">{r.name}</span>
      </figcaption>
    </figure>
  {/each}
</div>

<style>
  .stage {
    position: relative;
    margin-top: 3rem;
    height: 12.5rem;
    /* soften the peeking neighbours at the edges */
    mask-image: linear-gradient(to right, transparent, #000 16%, #000 84%, transparent);
  }
  .stage:focus {
    outline: none;
  }
  .stage:focus-visible {
    outline: 2px solid var(--lp-accent);
    outline-offset: 4px;
    border-radius: var(--lp-radius, 0.5rem);
  }
  .rt {
    position: absolute;
    top: 50%;
    left: 50%;
    margin: 0;
    width: 18rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    transition:
      transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.55s ease;
    will-change: transform, opacity;
  }
  .rt-icon {
    width: 3.25rem;
    height: 3.25rem;
    color: var(--sl-color-gray-3);
    transition: color 0.4s ease;
  }
  .rt-meta {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    transition: opacity 0.3s ease;
  }
  .rt-name {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--sl-color-white);
  }

  /* carousel positions — one big in the centre, two peeking, the rest hidden */
  .rt[data-pos='active'] {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    z-index: 2;
  }
  .rt[data-pos='active'] .rt-icon {
    color: var(--sl-color-white);
  }
  .rt[data-pos='prev'] {
    transform: translate(calc(-50% - 15rem), -50%) scale(0.55);
    opacity: 0.3;
    z-index: 1;
  }
  .rt[data-pos='next'] {
    transform: translate(calc(-50% + 15rem), -50%) scale(0.55);
    opacity: 0.3;
    z-index: 1;
  }
  .rt[data-pos='hidden'] {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
    z-index: 0;
  }
  /* only the centred runtime shows its name + description */
  .rt:not([data-pos='active']):not([data-pos='static']) .rt-meta {
    opacity: 0;
  }

  @media (max-width: 40rem) {
    .rt[data-pos='prev'] {
      transform: translate(calc(-50% - 9rem), -50%) scale(0.45);
    }
    .rt[data-pos='next'] {
      transform: translate(calc(-50% + 9rem), -50%) scale(0.45);
    }
  }

  /* We use static position for reduced motion */
  .rt[data-pos='static'] {
    position: static;
    width: auto;
    transform: none !important;
    opacity: 1 !important;
  }
  .rt[data-pos='static'] .rt-icon {
    color: var(--sl-color-gray-3);
  }
  .rt[data-pos='static'] .rt-meta {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    /* no auto-rotation: lay every runtime out in a static centred row */
    .stage {
      height: auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 2.5rem;
      mask-image: none;
    }
    .rt-name {
      font-size: 1.05rem;
    }
  }
</style>

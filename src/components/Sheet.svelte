<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();

  let panel: HTMLDivElement | undefined = $state();

  // Move focus into the sheet on open and give it back on close.
  $effect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel?.focus();
    return () => before?.focus?.();
  });

  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
    // Keep Tab inside the dialog while it is open.
    if (e.key === 'Tab' && panel) {
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
</script>

<svelte:window {onkeydown} />

<button class="scrim" aria-label="Close" onclick={onclose}></button>
<div class="sheet gutter" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1" bind:this={panel}>
  <div class="eyebrow" id="sheet-title">{title}</div>
  {@render children()}
</div>

<style>
  .scrim{position:fixed;inset:0;background:rgba(5,8,12,.45);z-index:20;border:0;padding:0;width:100%}
  .sheet{position:fixed;left:0;right:0;bottom:0;z-index:21;max-width:460px;margin:0 auto;background:var(--surface);border-top:1px solid var(--line);border-radius:20px 20px 0 0;padding-top:18px;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:14px;box-shadow:0 -8px 30px rgba(0,0,0,.25);animation:rise .2s ease-out}
  @keyframes rise{from{transform:translateY(24px);opacity:.6}}
  @media (prefers-reduced-motion: reduce){.sheet{animation:none}}
</style>

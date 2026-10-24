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

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

<button class="scrim" aria-label="Close" onclick={onclose}></button>
<div class="sheet gutter" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1" bind:this={panel}>
  <div class="eyebrow" id="sheet-title">{title}</div>
  {@render children()}
</div>

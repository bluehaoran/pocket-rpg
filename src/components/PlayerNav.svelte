<script lang="ts">
  import Icon from './Icon.svelte';

  /** "Player N of M" pager. Renders nothing for a single player. */
  let { index, count, onchange }: { index: number; count: number; onchange: (index: number) => void } = $props();
</script>

{#if count > 1}
  <div class="pnav">
    <button aria-label="Previous player" disabled={index === 0} onclick={() => onchange(index - 1)}><Icon name="arrow-left" size="28px" /></button>
    <span><span class="eyebrow">Player</span> <b>{index + 1}</b> <span class="of">of {count}</span></span>
    <button aria-label="Next player" disabled={index >= count - 1} onclick={() => onchange(index + 1)}><Icon name="arrow-right" size="28px" /></button>
  </div>
{/if}

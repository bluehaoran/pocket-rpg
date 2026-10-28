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

<style>
  .pnav{display:grid;grid-template-columns:64px minmax(0,1fr) 64px;align-items:stretch;min-height:60px;border:2px solid var(--line);border-radius:14px;background:var(--surface);overflow:hidden}
  .pnav button{border:0;background:var(--sunk);font:700 26px/1 var(--f-mono)}
  .pnav button:disabled{opacity:.35;cursor:not-allowed}
  .pnav>span{display:flex;align-items:center;justify-content:center;gap:8px}
  .pnav b{font:700 19px/1 var(--f-mono)}
  .pnav .of{color:var(--muted);font-size:15px}
</style>

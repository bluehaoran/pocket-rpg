<script lang="ts">
  // The Lasers & Feelings number bar: [over-check ▮▯▯▯ under-check] N
  let { n, range, over, under, onclick }: { n: number; range: [number, number]; over: string; under: string; onclick?: () => void } = $props();
  const ticks = $derived(Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i));
</script>

{#snippet inner()}
  <span class="lab">{over}</span>
  <span class="ticks" style="grid-template-columns:repeat({ticks.length},1fr)">
    {#each ticks as x (x)}<i class:on={x === n}></i>{/each}
  </span>
  <span class="lab">{under}</span>
  <span class="n">{n}</span>
{/snippet}

{#if onclick}
  <button class="scalebtn" {onclick} aria-label="Change number, now {n}">{@render inner()}</button>
{:else}
  <div class="scalebtn static" role="img" aria-label="{over} … {under}, number {n}">{@render inner()}</div>
{/if}

<style>
  .scalebtn{all:unset;cursor:pointer;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;min-height:56px;padding:6px 0 0;border-top:1px solid var(--line)}
  .scalebtn:focus-visible{outline:var(--ring);outline-offset:2px;border-radius:6px}
  .scalebtn .lab{font:700 12px/1 var(--f-body);text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
  .scalebtn .ticks{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
  .scalebtn .ticks i{height:12px;border-radius:3px;background:var(--sunk)}
  .scalebtn .ticks i.on{background:var(--sel)}
  .scalebtn .n{font:700 34px/1 var(--f-mono);min-width:1.2em;text-align:right}
  .scalebtn.static{cursor:default}
</style>

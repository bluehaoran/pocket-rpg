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

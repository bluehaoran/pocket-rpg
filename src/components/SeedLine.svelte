<script lang="ts">
  import type { Seed } from '../lib/content/types.ts';
  import Part from './Part.svelte';
  import { seedColumnText, seedParts } from '../lib/engine/template.ts';

  /** The story seed as a sentence whose column values each reroll on tap. */
  let { seed, values, onreroll }: { seed: Seed; values: string[] | undefined; onreroll: (col: number) => void } = $props();

  const parts = $derived(seedParts(seed.template));
</script>

<p>
  {#each parts as part, j (j)}
    {#if 'col' in part}
      <span class="nw"><Part label="Reroll {seed.columns[part.col]?.label}" onclick={() => onreroll(part.col)}>{seedColumnText(seed, values, part.col)}</Part>{part.trail}</span>
    {:else}{part.text}{/if}
  {/each}
</p>

<style>
  .nw{white-space:nowrap}
  p{margin:0}
</style>

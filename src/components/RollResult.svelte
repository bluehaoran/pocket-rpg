<script lang="ts">
  // The body of a rules roll result. Where it appears (sheet, inline, page) is up to the caller.
  import type { Roll } from '../lib/play.svelte.ts';
  import { play } from '../lib/play.svelte.ts';
  import KinResult from './KinResult.svelte';
  import LfResult from './LfResult.svelte';
  import RfsResult from './RfsResult.svelte';

  let { roll }: { roll: Roll } = $props();
</script>

{#key play.rolls}
  <div class="rollbody fresh" aria-live="polite">
    {#if roll.kind === 'lf'}
      <LfResult {roll} />
    {:else if roll.kind === 'kin'}
      <KinResult {roll} />
    {:else}
      <RfsResult {roll} />
    {/if}
  </div>
{/key}

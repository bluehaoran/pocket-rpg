<script lang="ts">
  import type { Roll } from '../lib/play.svelte.ts';
  import RollResult from './RollResult.svelte';
  import RollActions from './RollActions.svelte';

  // A roll result shown in place on the Track screen. `page` is the full-screen variant, which has no Done
  // button of its own because the page supplies one.
  let { roll, page = false }: { roll: Roll; page?: boolean } = $props();
</script>

<div class="result" class:big={page}>
  <RollResult {roll} />
  {#if !page}<RollActions {roll} doneGhost />{/if}
</div>

<style>
  .result{background:var(--surface);border:2px solid var(--ink);border-radius:18px;padding:12px 16px;display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow-y:auto;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
  .result.big{max-height:none;padding:18px}
</style>

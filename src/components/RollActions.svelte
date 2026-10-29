<script lang="ts">
  import { cancelRoll, closeRoll, rerollRfs, type Roll } from '../lib/play.svelte.ts';
  import Icon from './Icon.svelte';

  // What to do with a roll on screen. Roll for Shoes rolls can be thrown away (Cancel) or kept (Accept),
  // and each can roll the same skill again. Other rules just have Done.
  let { roll, doneGhost = false }: { roll: Roll; doneGhost?: boolean } = $props();
</script>

{#if roll.kind === 'rfs'}
  <div class="actions">
    <div class="pair">
      <button class="btn ghost" onclick={cancelRoll}>Cancel</button>
      <button class="btn ghost re" aria-label="Cancel and roll again" onclick={() => rerollRfs(false)}><Icon name="reroll" size="26px" /></button>
    </div>
    <div class="pair">
      <button class="btn" onclick={closeRoll}>Accept</button>
      <button class="btn re" aria-label="Accept and roll again" onclick={() => rerollRfs(true)}><Icon name="reroll" size="26px" /></button>
    </div>
  </div>
{:else}
  <button class="btn" class:ghost={doneGhost} onclick={closeRoll}>Done</button>
{/if}

<style>
  .actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .pair{display:grid;grid-template-columns:minmax(0,1fr) 62px;gap:6px}
  .re{padding:0}
</style>

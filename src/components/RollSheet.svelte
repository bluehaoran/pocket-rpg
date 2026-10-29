<script lang="ts">
  import { closeRoll, play, type Roll } from '../lib/play.svelte.ts';
  import Sheet from './Sheet.svelte';
  import RollResult from './RollResult.svelte';
  import NewSkillSheet from './NewSkillSheet.svelte';
  import RollActions from './RollActions.svelte';

  let { roll }: { roll: Roll } = $props();
</script>

{#if play.naming}
  <NewSkillSheet />
{:else}
  <Sheet title="Roll result" onclose={closeRoll}>
    <div class="rollsheet"><RollResult {roll} /></div>
    <RollActions {roll} />
  </Sheet>
{/if}

<style>
  .rollsheet{max-height:88vh;overflow-y:auto}
</style>

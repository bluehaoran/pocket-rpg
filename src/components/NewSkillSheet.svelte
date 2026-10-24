<script lang="ts">
  import { nameSkill, play, suggestSkillName } from '../lib/play.svelte.ts';
  import Sheet from './Sheet.svelte';
  import Die from './Die.svelte';

  let name = $state('');
  const e = $derived(play.roll?.kind === 'rfs' ? play.roll : null);
</script>

{#if e}
  <Sheet title="New skill · level {e.level + 1} · from {e.skillName}" onclose={() => (play.naming = false)}>
    <div class="row">
      <input aria-label="Skill name" placeholder="Name it after the action" autocomplete="off" bind:value={name} />
      <button class="dice" aria-label="Suggest a skill name" onclick={() => (name = suggestSkillName(name))}><Die value={5} size="sm" /></button>
    </div>
    <p class="hint">Roll for Shoes: name it after what the character just did, e.g. "Jump the gap".</p>
    <button class="btn" disabled={!name.trim()} onclick={() => nameSkill(name)}>Add skill</button>
  </Sheet>
{/if}

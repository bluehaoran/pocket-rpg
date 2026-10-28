<script lang="ts">
  // Body of a Kintsugi roll: the dice, the result, what the failure did, and the new-skill prompt.
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { kinFlavour } from '../lib/characters.ts';
  import { learnKinSkill, suggestKinSkill } from '../lib/play.svelte.ts';
  import { isFull, type KinRoll } from '../lib/rules/kintsugi.ts';
  import Die from './Die.svelte';

  let { roll }: { roll: KinRoll } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[roll.ci]);
  const flavour = $derived(kinFlavour(pack));
  const full = $derived(!!c && isFull(flavour, c));
  const level = $derived(flavour.newSkillLevel ?? 3);

  let name = $state('');
  let replace = $state<number | null>(null);
  const ready = $derived(!!name.trim() && (!full || replace != null));
</script>

<div class="eyebrow">{roll.who} · {roll.skillName} {roll.level}{roll.gm ? ` vs GM ${roll.gm.skill}` : ' · roll at or under'}</div>
<div class="dicerow">
  <span class="lab">Roll</span>
  <Die value={roll.die} size="lg" state={roll.result === 'win' ? 'ok' : roll.result === 'lose' ? 'no' : ''} />
  {#if roll.gm}<span class="sum">+ {roll.level} = {roll.total}</span>{/if}
</div>
{#if roll.gm}
  <div class="dicerow">
    <span class="lab">GM</span>
    <Die value={roll.gm.die} size="lg" />
    <span class="sum">+ {roll.gm.skill} = {roll.gmTotal}</span>
  </div>
{/if}
<div class="outc">{roll.text}</div>
{#if roll.result === 'tie'}<p class="rsub">Dead even, skill and die. The GM decides.</p>{/if}
{#if roll.grew}<div class="callout acc"><span class="t">Failing makes you stronger</span><span>{roll.grew}.</span></div>{/if}
{#if roll.needsSkill || roll.newSkill}
  <div class="callout acc">
    <span class="t">Failed {roll.skillName}</span>
    {#if roll.newSkill}
      <b>Learned: {roll.newSkill} {level}</b>
    {:else}
      <span>Describe how you changed, then name the new skill (level {level}).</span>
      <div class="newskill">
        <div class="gmrow">
          <input aria-label="Skill name" placeholder="e.g. Kicking: welded a sturdy leg on" autocomplete="off" bind:value={name} />
          <button class="dice" aria-label="Suggest a skill name" onclick={() => (name = suggestKinSkill(name))}><Die value={5} size="sm" /></button>
        </div>
        {#if full && c?.skills}
          <span>You hold the most skills allowed. Which one does it replace?</span>
          <ul class="chips" aria-label="Skill to replace">
            {#each c.skills as sk, i (i)}
              <li><button class="tog" aria-pressed={replace === i} onclick={() => (replace = i)}>{sk.name} {sk.level}{sk.out ? ' (out)' : ''}</button></li>
            {/each}
          </ul>
        {/if}
        <button class="mini-btn acc" disabled={!ready} onclick={() => learnKinSkill(name, replace ?? undefined)}>Add skill</button>
      </div>
    {/if}
  </div>
{/if}

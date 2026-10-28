<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { canSpend, xpAvailable, type RfsRoll } from '../lib/rules/roll-for-shoes.ts';
  import { failXp, play, spend } from '../lib/play.svelte.ts';
  import Die from './Die.svelte';

  // Body of a Roll for Shoes roll: the dice, the result, and the XP and new-skill actions.
  let { roll }: { roll: RfsRoll } = $props();

  const c = $derived(app.session!.characters[roll.ci]);
  const avail = $derived(c ? xpAvailable(c, roll) : 0);
</script>

  <div class="eyebrow">{roll.who} · {roll.skillName} · {roll.level}d6{roll.gm ? ` vs GM ${roll.gm.length}d6` : ''}</div>
  <div class="dicerow">
    <span class="lab">Roll</span>
    {#each roll.dice as v, j (j)}<Die value={v} size="lg" state={v === 6 ? 'ok' : ''} />{/each}
    {#if roll.mod}<span class="sum">{roll.mod}</span>{/if}
    <span class="sum">= {roll.sum}</span>
  </div>
  {#if roll.gm}
    <div class="dicerow">
      <span class="lab">GM</span>
      {#each roll.gm as v, j (j)}<Die value={v} size="lg" state="no" />{/each}
      <span class="sum">= {roll.gmSum}</span>
    </div>
  {/if}
  <div class="outc">{roll.text}{#if roll.spent}<small>{roll.spent} XP spent</small>{/if}</div>
  {#if roll.mods.length}<p class="rsub">Status applied: {roll.mods.join(', ')}</p>{/if}
  {#if roll.result === 'tie'}<p class="rsub">Tie. The GM decides; if it counts as a fail, add the XP.</p>{/if}
  {#if !roll.gm}<p class="rsub">Compare with the GM's roll. Higher wins.</p>{/if}
  {#if roll.xpGiven}<div class="callout acc"><span class="t">+1 XP for failing</span></div>{/if}
  {#if roll.allSix}
    <div class="callout acc">
      <span class="t">Every die is a 6</span>
      <span>New skill at level {roll.level + 1}, branching from {roll.skillName}.</span>
      {#if roll.newSkill}<b>Learned: {roll.newSkill} {roll.level + 1}</b>
      {:else}<button class="mini-btn acc" onclick={() => (play.naming = true)}>Name the new skill</button>{/if}
    </div>
  {/if}
  {#if c}
    <div class="chips">
      {#if !roll.xpGiven && !roll.allSix && (!roll.gm || roll.result === 'tie')}
        <button class="mini-btn" onclick={() => failXp(roll)}>Failed: +1 XP</button>
      {/if}
      {#if canSpend(c, roll)}
        <button class="mini-btn" onclick={spend}>Spend 1 XP: lowest die → 6 <small>({avail} left)</small></button>
      {/if}
    </div>
  {/if}

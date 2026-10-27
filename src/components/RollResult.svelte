<script lang="ts">
  // The body of a rules roll result. Where it appears (sheet, inline, page) is up to the caller.
  import { packs } from '../lib/content/index.ts';
  import { app } from '../lib/session.svelte.ts';
  import { lfFlavour } from '../lib/characters.ts';
  import { canSpend, xpAvailable } from '../lib/rules/roll-for-shoes.ts';
  import { chooseExact, drawQuestion, failXp, play, spend, type Roll } from '../lib/play.svelte.ts';
  import Die from './Die.svelte';
  import KinResult from './KinResult.svelte';

  let { roll }: { roll: Roll } = $props();

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const ex = $derived(lfFlavour(pack).exact ?? {});
  const c = $derived(roll.kind === 'rfs' ? s.characters[roll.ci] : undefined);
  const avail = $derived(c && roll.kind === 'rfs' ? xpAvailable(c, roll) : 0);
</script>

{#key play.rolls}
  <div class="rollbody fresh" aria-live="polite">
    {#if roll.kind === 'lf'}
      <div class="eyebrow">{roll.who} · {roll.check} · {roll.dice.length}d6 {roll.dir} {roll.N}{roll.bonuses.length ? ' · ' + roll.bonuses.join(', ') : ''}</div>
      <div class="dicerow">
        {#each roll.dice as v, j (j)}<Die value={v} size="lg" state={roll.marks[j]} />{/each}
      </div>
      <div class="outc">{roll.outcome}<small>{roll.successes} success{roll.successes === 1 ? '' : 'es'}</small></div>
      {#if roll.outText}<p class="rsub">{roll.outText}</p>{/if}
      {#if roll.picks?.length}
        <div class="callout acc"><span class="t">Pick one</span><ul>{#each roll.picks as p (p)}<li>{p}</li>{/each}</ul></div>
      {/if}
      {#if roll.exact}
        <div class="callout">
          <span class="t">{ex.name ?? 'Exact number'}{ex.countsAsSuccess === false ? ' · not a success' : ''}</span>
          {#if ex.text}<span>{ex.text}</span>{/if}
          {#each ex.options ?? [] as o, j (o.id)}
            <button class="choice" aria-pressed={roll.exChoice === j} onclick={() => chooseExact(j)}><b>{o.label}</b>{o.text}</button>
          {/each}
          {#if Array.isArray(ex.questions)}
            <ul>{#each ex.questions as q (q)}<li>{q}</li>{/each}</ul>
          {:else if typeof ex.questions === 'string'}
            {#if roll.exQ}<b>{roll.exQ}</b>{/if}
            <button class="mini-btn" onclick={drawQuestion}>{roll.exQ ? 'Another question' : 'Draw a question'}</button>
          {/if}
        </div>
      {/if}
    {:else if roll.kind === 'kin'}
      <KinResult {roll} />
    {:else}
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
    {/if}
  </div>
{/key}

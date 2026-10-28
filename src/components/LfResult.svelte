<script lang="ts">
  import { currentPack } from '../lib/session.svelte.ts';
  import { lfFlavour } from '../lib/characters.ts';
  import type { LfRoll } from '../lib/rules/lasers-feelings.ts';
  import { chooseExact, drawQuestion } from '../lib/play.svelte.ts';
  import Die from './Die.svelte';

  // Body of a Lasers & Feelings roll: the dice, the outcome, and the exact-number prompt.
  let { roll }: { roll: LfRoll } = $props();

  const ex = $derived(lfFlavour(currentPack()).exact ?? {});
</script>

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

<style>
  .choice{min-height:48px;width:100%;border-radius:12px;border:2px solid var(--line);background:var(--bg);text-align:left;padding:8px 12px;font-size:15px;line-height:1.3}
  .choice b{display:block}
</style>

<script lang="ts">
  import { orderedPacks } from '../../lib/content/index.ts';
  import { RULES, type RulesId } from '../../lib/content/types.ts';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate } from '../../lib/session.svelte.ts';
  import { MAX_PLAYERS, setPlayers, setRules } from '../../lib/setup.ts';
  import { RULES_INFO, runs } from '../../lib/rulesInfo.ts';
  import OptCard from '../../components/OptCard.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import Icon from '../../components/Icon.svelte';

  const s = $derived(app.session!);

  let about = $state<RulesId | null>(null);
</script>

<section class="group">
  <h1>New session</h1>
  <p class="hint">A quick walkthrough to set up a game.</p>
</section>

<section class="group">
  <div class="eyebrow">Step 1 of 4</div>
  <h2>System</h2>
  <div class="eyebrow">Rule system</div>
  {#each Object.entries(RULES) as [id, label] (id)}
    <div class="opt-wrap">
      <OptCard title={label} meta={RULES_INFO[id as RulesId].short} more={RULES_INFO[id as RulesId].more}
        pressed={s.rulesId === id} onclick={() => mutate(x => setRules(x, id as RulesId, orderedPacks()))} />
      <button class="learn" aria-label="Learn more about {label}" aria-haspopup="dialog" onclick={() => (about = id as RulesId)}>Learn more?</button>
    </div>
  {/each}
</section>

<section class="group">
  <div class="eyebrow">Players</div>
  <Stepper label="players" min={1} max={MAX_PLAYERS} bind:value={() => s.players, v => mutate(x => setPlayers(x, v))} />
  <p class="hint">One character per player. Up to {MAX_PLAYERS}.</p>
</section>

<button class="btn" onclick={() => go('/track/setting')}>Setting <Icon name="arrow-right" stroke={4} /></button>

{#if about}
  {@const info = RULES_INFO[about]}
  <Sheet title={RULES[about]} onclose={() => (about = null)}>
    <div class="rules-about">
      <p class="hint">by <a href={info.url} target="_blank" rel="noopener noreferrer">{info.by}</a> · {info.short}</p>
      <p>{info.more}</p>
      {#each info.paragraphs as para (para)}
        <p>{#each runs(para) as r, i (i)}{#if r.em}<em>{r.t}</em>{:else}{r.t}{/if}{/each}</p>
      {/each}
    </div>
    <button class="btn ghost" onclick={() => (about = null)}>Close</button>
  </Sheet>
{/if}

<style>
  .opt-wrap{position:relative}
  .opt-wrap :global(.opt){padding-bottom:50px}
  .learn{all:unset;box-sizing:border-box;cursor:pointer;position:absolute;right:16px;bottom:4px;min-height:44px;display:flex;align-items:center;color:var(--accent);font:700 15px var(--f-body);text-decoration:underline;text-underline-offset:3px}
  .learn:focus-visible{outline:var(--ring);outline-offset:-2px;border-radius:8px}
  .rules-about{display:flex;flex-direction:column;gap:10px;max-height:55vh;overflow-y:auto}
  .rules-about p{margin:0}
  .rules-about a{color:inherit}
</style>

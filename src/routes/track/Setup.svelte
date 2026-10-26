<script lang="ts">
  import { orderedPacks } from '../../lib/content/index.ts';
  import { RULES, type RulesId } from '../../lib/content/types.ts';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate } from '../../lib/session.svelte.ts';
  import { MAX_PLAYERS, setPlayers, setRules } from '../../lib/setup.ts';
  import { RULES_INFO, runs } from '../../lib/rulesInfo.ts';
  import Sheet from '../../components/Sheet.svelte';
  import Stepper from '../../components/Stepper.svelte';

  const s = $derived(app.session!);

  let about = $state<RulesId | null>(null);

  const RULE_META: Record<RulesId, { short: string; more: string }> = {
    'lasers-feelings': {
      short: 'One number, two checks · 1–3d6',
      more: 'Roll under your number for Lasers (logic, tech), over it for Feelings (people, instinct). Quick to learn; one-shot friendly. Genre hacks included.'
    },
    'roll-for-shoes': {
      short: 'Skill tree · level = d6 vs GM · XP on fail',
      more: 'Roll as many d6 as your skill level against the GM. All sixes earns a new skill; a miss earns XP. Settings are short, ready-made scenarios.'
    }
  };
</script>

<section class="group">
  <div class="eyebrow">Step 1 of 4</div>
  <h2>New session</h2>
</section>

<section class="group">
  <div class="eyebrow">Rule system</div>
  {#each Object.entries(RULES) as [id, label] (id)}
    <div class="opt-wrap">
      <button class="opt" aria-pressed={s.rulesId === id} onclick={() => mutate(x => setRules(x, id as RulesId, orderedPacks()))}>
        <span class="radio"></span><span class="t">{label}</span>
        <span class="m">{RULE_META[id as RulesId].short}</span>
        <span class="m more">{RULE_META[id as RulesId].more}</span>
      </button>
      <button class="help" aria-label="About {label}" aria-haspopup="dialog" onclick={() => (about = id as RulesId)}>?</button>
    </div>
  {/each}
</section>

<section class="group">
  <div class="eyebrow">Players</div>
  <Stepper label="players" min={1} max={MAX_PLAYERS} bind:value={() => s.players, v => mutate(x => setPlayers(x, v))} />
  <p class="hint">One character per player. Up to {MAX_PLAYERS}.</p>
</section>

<button class="btn" onclick={() => go('/track/setting')}>Setting →</button>

{#if about}
  {@const info = RULES_INFO[about]}
  <Sheet title={RULES[about]} onclose={() => (about = null)}>
    <div class="about">
      <p class="hint">by <a href={info.url} target="_blank" rel="noopener noreferrer">{info.by}</a></p>
      {#each info.paragraphs as para (para)}
        <p>{#each runs(para) as r}{#if r.em}<em>{r.t}</em>{:else}{r.t}{/if}{/each}</p>
      {/each}
    </div>
    <button class="btn ghost" onclick={() => (about = null)}>Close</button>
  </Sheet>
{/if}

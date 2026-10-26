<script lang="ts">
  import { orderedPacks, packs } from '../../lib/content/index.ts';
  import { RULES, type RulesId } from '../../lib/content/types.ts';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate } from '../../lib/session.svelte.ts';
  import { isRfs, rfsConfig, rootSkill, rfsFlavour } from '../../lib/characters.ts';
  import { MAX_PLAYERS, charCtx, nativeFor, setPack, setPlayers, setRules, setStarter, starterOf } from '../../lib/setup.ts';
  import { mathRng } from '../../lib/engine/rng.ts';
  import { RULES_INFO } from '../../lib/rulesInfo.ts';
  import Sheet from '../../components/Sheet.svelte';
  import Stepper from '../../components/Stepper.svelte';

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const own = $derived(nativeFor(orderedPacks(), s.rulesId));
  const rfs = $derived(isRfs(s.rulesId));
  const k = $derived(rfsConfig(pack));
  const starter = $derived(starterOf(s, pack));
  const hasSetting = $derived(rfsFlavour(pack).fields.some(f => f.skill));

  let picking = $state(false);
  let about = $state<RulesId | null>(null);
  const basis = (p: { name: string; version: string }) => `Based on ${p.name} v${p.version}`;

  const RULE_META: Record<RulesId, string> = {
    'lasers-feelings': 'One number, two checks · 1–3d6',
    'roll-for-shoes': 'Skill tree · level = d6 vs GM · XP on fail'
  };
</script>

<section class="group">
  <div class="eyebrow">Step 1 of 3</div>
  <h2>New session</h2>
</section>

<section class="group">
  <div class="eyebrow">Rule system</div>
  {#each Object.entries(RULES) as [id, label] (id)}
    <div class="opt-wrap">
      <button class="opt" aria-pressed={s.rulesId === id} onclick={() => mutate(x => setRules(x, id as RulesId, orderedPacks()))}>
        <span class="radio"></span><span class="t">{label}</span><span class="m">{RULE_META[id as RulesId]}</span>
      </button>
      <button class="help" aria-label="About {label}" aria-haspopup="dialog" onclick={() => (about = id as RulesId)}>?</button>
    </div>
  {/each}
</section>

{#if rfs}
  <section class="group">
    <div class="eyebrow">Starting skills per character</div>
    <Stepper label="starting skills" min={0} max={k.max}
      bind:value={() => starter, v => mutate(x => setStarter(x, charCtx(x, pack, mathRng), v))} />
    <p class="hint">
      {#if starter}
        Each character also starts with {starter} level-{k.level} skill{starter > 1 ? 's' : ''} under {rootSkill(pack)}. House rule.
      {:else}
        Original rules: everyone starts with {rootSkill(pack)} 1{hasSetting ? ', plus any skills the setting gives' : ' only'}.
      {/if}
    </p>
  </section>
{/if}

<section class="group">
  <div class="eyebrow">{rfs ? 'Setting' : 'Genre'}</div>
  {#if own.length}
    <button class="opt" aria-pressed="true" aria-haspopup="dialog" onclick={() => (picking = true)}>
      <span class="radio"></span><span class="t">{pack.genre ?? pack.name}</span>
      <span class="m">{basis(pack)} · tap to change</span>
    </button>
  {:else}
    <p class="hint">No packs written for this rule system yet.</p>
  {/if}
</section>

<section class="group">
  <div class="eyebrow">Players</div>
  <Stepper label="players" min={1} max={MAX_PLAYERS} bind:value={() => s.players, v => mutate(x => setPlayers(x, v))} />
  <p class="hint">One character per player. Up to {MAX_PLAYERS}.</p>
</section>

<button class="btn" onclick={() => go('/track/story')}>Story →</button>

{#if picking}
  <Sheet title={rfs ? 'Choose a setting' : 'Choose a genre'} onclose={() => (picking = false)}>
    <div class="btn-row" role="group" aria-label={rfs ? 'Settings' : 'Genres'}>
      {#each own as p (p.id)}
        <button class="opt" aria-pressed={p.id === pack.id} onclick={() => { mutate(x => setPack(x, p.id)); picking = false; }}>
          <span class="radio"></span><span class="t">{p.genre ?? p.name}</span><span class="m">{basis(p)}</span>
        </button>
      {/each}
    </div>
  </Sheet>
{/if}

{#if about}
  {@const info = RULES_INFO[about]}
  <Sheet title={RULES[about]} onclose={() => (about = null)}>
    <div class="about">
      {#each info.paragraphs as para (para)}<p>{para}</p>{/each}
      {#if info.rules}
        <ol>{#each info.rules as r (r)}<li>{r}</li>{/each}</ol>
      {/if}
      <p class="hint"><a href={info.url} target="_blank" rel="noopener noreferrer">{info.credit}</a></p>
    </div>
    <button class="btn ghost" onclick={() => (about = null)}>Close</button>
  </Sheet>
{/if}

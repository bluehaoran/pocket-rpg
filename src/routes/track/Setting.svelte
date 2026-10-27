<script lang="ts">
  import { orderedPacks, packs } from '../../lib/content/index.ts';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate } from '../../lib/session.svelte.ts';
  import { isRfs, rfsConfig, rootSkill, rfsFlavour } from '../../lib/characters.ts';
  import { charCtx, nativeFor, setPack, setStarter, starterOf } from '../../lib/setup.ts';
  import { mathRng } from '../../lib/engine/rng.ts';
  import Stepper from '../../components/Stepper.svelte';
  import Icon from '../../components/Icon.svelte';

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const own = $derived(nativeFor(orderedPacks(), s.rulesId));
  const rfs = $derived(isRfs(s.rulesId));
  const k = $derived(rfsConfig(pack));
  const starter = $derived(starterOf(s, pack));
  const hasSetting = $derived(rfsFlavour(pack).fields.some(f => f.skill));

  const basis = (p: { name: string; version: string }) => `Based on ${p.name} v${p.version}`;
</script>

<section class="group">
  <div class="eyebrow">Step 2 of 4</div>
  <h2>Setting</h2>
</section>

<section class="group">
  <div class="eyebrow">{rfs ? 'Setting' : 'Genre'}</div>
  {#if own.length}
    <div class="group" role="group" aria-label={rfs ? 'Settings' : 'Genres'}>
      {#each own as p (p.id)}
        <button class="opt" aria-pressed={p.id === pack.id} onclick={() => mutate(x => setPack(x, p.id))}>
          <span class="radio"></span><span class="t">{p.genre ?? p.name}</span><span class="m">{basis(p)}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="hint">No packs written for this rule system yet.</p>
  {/if}
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

<button class="btn" onclick={() => go('/track/story')}>Story <Icon name="arrow-right" stroke={4} /></button>

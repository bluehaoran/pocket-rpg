<script lang="ts">
  import { onMount } from 'svelte';
  import { packs } from '../../lib/content/index.ts';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate } from '../../lib/session.svelte.ts';
  import { charCtx, ensureSetup, rollAllFields, startPlay } from '../../lib/setup.ts';
  import { isKin, isRfs } from '../../lib/characters.ts';
  import type { FieldRef } from '../../lib/fields.ts';
  import { mathRng } from '../../lib/engine/rng.ts';
  import { buzz } from '../../lib/device.ts';
  import CharacterCard from '../../components/CharacterCard.svelte';
  import FieldSheet from '../../components/FieldSheet.svelte';
  import RerollIcon from '../../components/RerollIcon.svelte';

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  let active = $state(0);
  let editing = $state<FieldRef | null>(null);

  onMount(() => {
    mutate(x => ensureSetup(x, charCtx(x, pack, mathRng)));
  });
  $effect(() => {
    if (active >= s.players) active = s.players - 1;
  });

  const rollAll = () => {
    mutate(x => rollAllFields(x, charCtx(x, pack, mathRng), active));
    buzz();
  };
  const start = () => {
    mutate(x => startPlay(x, pack.genre ?? pack.name));
    go('/track');
  };
</script>

<section class="group">
  <div class="eyebrow">Step 4 of 4 · {pack.genre ?? pack.name}{isRfs(s.rulesId) ? ' · Roll for Shoes' : isKin(s.rulesId) ? ' · Kintsugi' : ''}</div>
  <h2>Players</h2>
</section>

{#if s.players > 1}
  <div class="pnav">
    <button aria-label="Previous player" disabled={active === 0} onclick={() => active--}>←</button>
    <span><span class="eyebrow">Player</span> <b>{active + 1}</b> <span class="of">of {s.players}</span></span>
    <button aria-label="Next player" disabled={active >= s.players - 1} onclick={() => active++}>→</button>
  </div>
{/if}

{#key active}
  <CharacterCard index={active} onedit={ref => (editing = ref)} />
{/key}

<button class="btn ghost" onclick={rollAll}>Reroll all <RerollIcon /></button>
<button class="btn" onclick={start}>Start play</button>

{#if editing}
  <FieldSheet fieldRef={editing} onclose={() => (editing = null)} />
{/if}

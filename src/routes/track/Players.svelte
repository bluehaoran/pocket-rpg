<script lang="ts">
  import { onMount } from 'svelte';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate, currentPack } from '../../lib/session.svelte.ts';
  import { charCtx, ensureSetup, rollAllFields, startPlay } from '../../lib/setup.ts';
  import { isKin, isRfs } from '../../lib/characters.ts';
  import type { FieldRef } from '../../lib/fields.ts';
  import { mathRng } from '../../lib/engine/rng.ts';
  import { buzz } from '../../lib/device.ts';
  import CharacterCard from '../../components/CharacterCard.svelte';
  import PlayerNav from '../../components/PlayerNav.svelte';
  import FieldSheet from '../../components/FieldSheet.svelte';
  import Icon from '../../components/Icon.svelte';

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
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

<PlayerNav index={active} count={s.players} onchange={i => (active = i)} />

{#key active}
  <CharacterCard index={active} onedit={ref => (editing = ref)} />
{/key}

<button class="btn ghost" onclick={rollAll}>Reroll all <Icon name="reroll" /></button>
<button class="btn" onclick={start}>Start play</button>

{#if editing}
  <FieldSheet fieldRef={editing} onclose={() => (editing = null)} />
{/if}

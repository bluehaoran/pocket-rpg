<script lang="ts">
  import { go, href } from '../../lib/router.svelte.ts';
  import { app } from '../../lib/session.svelte.ts';
  import { isKin, isRfs } from '../../lib/characters.ts';
  import { closeRoll, play } from '../../lib/play.svelte.ts';
  import CharacterCard from '../../components/CharacterCard.svelte';
  import LfControls from '../../components/LfControls.svelte';
  import RfsControls from '../../components/RfsControls.svelte';
  import GmControl from '../../components/GmControl.svelte';
  import KinControls from '../../components/KinControls.svelte';
  import KinGmControl from '../../components/KinGmControl.svelte';
  import RollResult from '../../components/RollResult.svelte';
  import Icon from '../../components/Icon.svelte';

  let { idx }: { idx: number } = $props();
  const s = $derived(app.session!);
</script>

<div class="toolhead">
  <a class="back" href={href('/track')} style="text-decoration:none">‹ Track</a>
  <span class="eyebrow">Character</span>
</div>

{#if s.players > 1}
  <div class="pnav">
    <button aria-label="Previous player" disabled={idx === 0} onclick={() => go(`/track/char/${idx - 1}`)}><Icon name="arrow-left" size="28px" /></button>
    <span><span class="eyebrow">Player</span> <b>{idx + 1}</b> <span class="of">of {s.players}</span></span>
    <button aria-label="Next player" disabled={idx >= s.players - 1} onclick={() => go(`/track/char/${idx + 1}`)}><Icon name="arrow-right" size="28px" /></button>
  </div>
{/if}

{#if isKin(s.rulesId)}<KinGmControl />{:else if isRfs(s.rulesId)}<GmControl />{/if}

<div class="pcard">
  <CharacterCard index={idx} />
  {#if isKin(s.rulesId)}<KinControls ci={idx} />{:else if isRfs(s.rulesId)}<RfsControls ci={idx} />{:else}<LfControls ci={idx} />{/if}
  {#if play.mode === 'inline' && play.roll?.ci === idx}
    <div class="result"><RollResult roll={play.roll} /><button class="btn ghost" onclick={closeRoll}>Done</button></div>
  {/if}
</div>

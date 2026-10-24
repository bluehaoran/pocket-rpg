<script lang="ts">
  import { go, href } from '../../lib/router.svelte.ts';
  import { app } from '../../lib/session.svelte.ts';
  import { isRfs } from '../../lib/characters.ts';
  import { closeRoll, play } from '../../lib/play.svelte.ts';
  import CharacterCard from '../../components/CharacterCard.svelte';
  import LfControls from '../../components/LfControls.svelte';
  import RfsControls from '../../components/RfsControls.svelte';
  import GmControl from '../../components/GmControl.svelte';
  import RollResult from '../../components/RollResult.svelte';

  let { idx }: { idx: number } = $props();
  const s = $derived(app.session!);
</script>

<div class="toolhead">
  <a class="back" href={href('/track')} style="text-decoration:none">‹ Track</a>
  <span class="eyebrow">Character</span>
</div>

{#if s.players > 1}
  <div class="pnav">
    <button aria-label="Previous player" disabled={idx === 0} onclick={() => go(`/track/char/${idx - 1}`)}>←</button>
    <span><span class="eyebrow">Player</span> <b>{idx + 1}</b> <span class="of">of {s.players}</span></span>
    <button aria-label="Next player" disabled={idx >= s.players - 1} onclick={() => go(`/track/char/${idx + 1}`)}>→</button>
  </div>
{/if}

{#if isRfs(s.rulesId)}<GmControl />{/if}

<div class="pcard">
  <CharacterCard index={idx} />
  {#if isRfs(s.rulesId)}<RfsControls ci={idx} />{:else}<LfControls ci={idx} />{/if}
  {#if play.mode === 'inline' && play.roll?.ci === idx}
    <div class="result"><RollResult roll={play.roll} /><button class="btn ghost" onclick={closeRoll}>Done</button></div>
  {/if}
</div>

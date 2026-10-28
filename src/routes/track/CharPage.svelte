<script lang="ts">
  import { go, href } from '../../lib/router.svelte.ts';
  import BackBar from '../../components/BackBar.svelte';
  import { app } from '../../lib/session.svelte.ts';
  import { closeRoll, play } from '../../lib/play.svelte.ts';
  import CharacterCard from '../../components/CharacterCard.svelte';
  import RulesControls from '../../components/RulesControls.svelte';
  import GmControls from '../../components/GmControls.svelte';
  import RollResult from '../../components/RollResult.svelte';
  import PlayerNav from '../../components/PlayerNav.svelte';

  let { idx }: { idx: number } = $props();
  const s = $derived(app.session!);
</script>

<BackBar href={href('/track')} label="Track" title="Character" />

<PlayerNav index={idx} count={s.players} onchange={i => go(`/track/char/${i}`)} />

<GmControls />

<div class="pcard">
  <CharacterCard index={idx} />
  <RulesControls ci={idx} />
  {#if play.mode === 'inline' && play.roll?.ci === idx}
    <div class="result"><RollResult roll={play.roll} /><button class="btn ghost" onclick={closeRoll}>Done</button></div>
  {/if}
</div>

<script lang="ts">
  import { href, router } from '../../lib/router.svelte.ts';
  import { app } from '../../lib/session.svelte.ts';
  import BackBar from '../../components/BackBar.svelte';
  import RollActions from '../../components/RollActions.svelte';
  import { closeRoll, play } from '../../lib/play.svelte.ts';
  import StoryCard from '../../components/StoryCard.svelte';
  import PartyCard from '../../components/PartyCard.svelte';
  import GmControls from '../../components/GmControls.svelte';
  import RollSheet from '../../components/RollSheet.svelte';
  import InlineRoll from '../../components/InlineRoll.svelte';
  import NewSkillSheet from '../../components/NewSkillSheet.svelte';
  import CharPage from './CharPage.svelte';
  import Tog from '../../components/Tog.svelte';
  import History from '../History.svelte';

  const s = $derived(app.session!);
  const sub = $derived(router.route.rest[0]);
  const idx = $derived(Number(router.route.rest[1]));
</script>

{#if sub === 'history'}
  <History which="track" />
{:else if play.roll && play.mode === 'page'}
  <BackBar label="Track" title="Roll" onclick={closeRoll} />
  <h2>{play.roll.kind === 'lf' ? play.roll.check : play.roll.skillName}</h2>
  <InlineRoll roll={play.roll} page />
  <p class="hint">Same layout as the Dice tool. Done returns to Track.</p>
  <RollActions roll={play.roll} />
  {#if play.naming}<NewSkillSheet />{/if}
{:else}
  {#if sub === 'char' && s.characters[idx]}
    <CharPage {idx} />
  {:else}
    {#if import.meta.env.DEV}
      <section aria-label="Mockup options">
        <div class="eyebrow">Dev: roll result placement</div>
        <ul class="chips">
          {#each ['sheet', 'inline', 'page'] as m (m)}
            <li><Tog pressed={play.mode === m} onclick={() => (play.mode = m as typeof play.mode)}>{m}</Tog></li>
          {/each}
        </ul>
      </section>
    {/if}
    <StoryCard />
    <section class="group">
      <div class="eyebrow">Party</div>
      <GmControls />
      {#each s.characters.slice(0, s.players) as _, i (i)}<PartyCard ci={i} />{/each}
    </section>
    <a class="btn ghost" href={href('/track/history')}>History · {s.trackHistory.length}</a>
  {/if}
  {#if play.roll && play.mode === 'sheet'}<RollSheet roll={play.roll} />{/if}
{/if}

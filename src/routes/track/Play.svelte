<script lang="ts">
  import { href, router } from '../../lib/router.svelte.ts';
  import { app } from '../../lib/session.svelte.ts';
  import { isKin, isRfs } from '../../lib/characters.ts';
  import { closeRoll, play } from '../../lib/play.svelte.ts';
  import StoryCard from '../../components/StoryCard.svelte';
  import PartyCard from '../../components/PartyCard.svelte';
  import GmControl from '../../components/GmControl.svelte';
  import KinGmControl from '../../components/KinGmControl.svelte';
  import RollSheet from '../../components/RollSheet.svelte';
  import RollResult from '../../components/RollResult.svelte';
  import NewSkillSheet from '../../components/NewSkillSheet.svelte';
  import CharPage from './CharPage.svelte';
  import History from '../History.svelte';

  const s = $derived(app.session!);
  const sub = $derived(router.route.rest[0]);
  const idx = $derived(Number(router.route.rest[1]));
</script>

{#if sub === 'history'}
  <History which="track" />
{:else if play.roll && play.mode === 'page'}
  <div class="toolhead"><button class="back" onclick={closeRoll}>‹ Track</button><span class="eyebrow">Roll</span></div>
  <h2>{play.roll.kind === 'lf' ? play.roll.check : play.roll.skillName}</h2>
  <div class="result big"><RollResult roll={play.roll} /></div>
  <p class="hint">Same layout as the Dice tool. Done returns to Track.</p>
  <button class="btn" onclick={closeRoll}>Done</button>
  {#if play.naming}<NewSkillSheet />{/if}
{:else}
  {#if sub === 'char' && s.characters[idx]}
    <CharPage {idx} />
  {:else}
    {#if import.meta.env.DEV}
      <section class="mock" aria-label="Mockup options">
        <div class="eyebrow">Dev: roll result placement</div>
        <ul class="chips">
          {#each ['sheet', 'inline', 'page'] as m (m)}
            <li><button class="tog" aria-pressed={play.mode === m} onclick={() => (play.mode = m as typeof play.mode)}>{m}</button></li>
          {/each}
        </ul>
      </section>
    {/if}
    <StoryCard />
    <section class="group">
      <div class="eyebrow">Party</div>
      {#if isKin(s.rulesId)}<KinGmControl />{:else if isRfs(s.rulesId)}<GmControl />{/if}
      {#each s.characters.slice(0, s.players) as _, i (i)}<PartyCard ci={i} />{/each}
    </section>
    <a class="btn ghost" href={href('/track/history')} style="text-decoration:none">History · {s.trackHistory.length}</a>
  {/if}
  {#if play.roll && play.mode === 'sheet'}<RollSheet roll={play.roll} />{/if}
{/if}

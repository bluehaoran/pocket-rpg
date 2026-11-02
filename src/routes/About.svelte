<script lang="ts">
  import about from '../../content/about.json';
  import Icon from '../components/Icon.svelte';
  import { clearAppCache, tapCounter } from '../lib/refresh.ts';

  // Tap the die three times to clear the app cache and reload, so an installed phone app picks up the latest version.
  let clearing = $state(false);
  const tap = tapCounter(3, async () => {
    clearing = true;
    try {
      await clearAppCache();
    } finally {
      location.reload();
    }
  });
</script>

<section class="group about">
  <div class="head">
    <h2>{about.title}</h2>
    <button class="die-tap" type="button" aria-label={clearing ? 'Clearing the app cache' : 'Tap three times to clear the app cache'} onclick={tap}><Icon name="dice" size="28px" /></button>
  </div>
  <p>{about.why}</p>
  <p>{about.thanks}</p>
  <p>
    {about.contactIntro}
    {#if about.contactUrl}
      <a href={about.contactUrl} target="_blank" rel="noopener noreferrer">{about.contact}</a>.
    {:else}
      {about.contact}.
    {/if}
  </p>
  <p>{about.donateIntro}</p>
  {#if about.donateUrl}
    <a class="btn" href={about.donateUrl} target="_blank" rel="noopener noreferrer">{about.donateLabel}</a>
    <p class="hint">{about.donateOffline}</p>
  {:else}
    <p class="hint">{about.donateLabel} link coming soon.</p>
  {/if}
</section>

<style>
  .head{display:flex;align-items:center;justify-content:space-between}
  .die-tap{display:grid;place-items:center;min-width:44px;min-height:44px;padding:0;border:0;background:none;color:var(--muted)}
  .about p{margin:0}
  .about p a{color:inherit}
</style>

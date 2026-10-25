<script lang="ts">
  import welcome from '../../content/welcome.json';
  import { app } from '../lib/session.svelte.ts';
  import { hideWelcome, setHideWelcome } from '../lib/prefs.ts';

  let hide = $state(hideWelcome());
  const inPlay = $derived(app.session?.started === true);
</script>

<section class="group">
  <h2>{welcome.title}</h2>
  <p class="hint">{welcome.intro}</p>
</section>

<label class="checkrow">
  <input type="checkbox" bind:checked={hide} onchange={() => setHideWelcome(hide)} />
  Don't show this screen on startup
</label>

{#snippet arrow()}
  <svg class="doodle" viewBox="0 0 60 120" aria-hidden="true" focusable="false">
    <path d="M31 4 C22 24 38 38 28 58 C20 74 36 86 30 108" />
    <path d="M14 90 C20 98 26 104 30 110 C36 102 42 96 48 88" />
  </svg>
{/snippet}

<div class="welcome-cols">
  <section class="welcome-col" aria-labelledby="w-track">
    <div class="eyebrow" id="w-track">{welcome.track.title}</div>
    <p>{welcome.track.body}</p>
    <div class="hand">{inPlay ? welcome.track.resume : welcome.track.start}</div>
    {@render arrow()}
  </section>
  <section class="welcome-col" aria-labelledby="w-tools">
    <div class="eyebrow" id="w-tools">{welcome.tools.title}</div>
    <p>{welcome.tools.body}</p>
    <div class="hand">{welcome.tools.open}</div>
    {@render arrow()}
  </section>
</div>

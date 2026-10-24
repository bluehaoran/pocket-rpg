<script lang="ts">
  import welcome from '../../content/welcome.json';
  import { go } from '../lib/router.svelte.ts';
  import { app } from '../lib/session.svelte.ts';
  import { hideWelcome, setHideWelcome } from '../lib/prefs.ts';

  let hide = $state(hideWelcome());
  const inPlay = $derived(app.session?.started === true);
</script>

<section class="group">
  <h2>{welcome.title}</h2>
  <p class="hint">{welcome.intro}</p>
</section>

<section class="group welcome-cards">
  <div class="card welcome-card">
    <div class="eyebrow">{welcome.track.title}</div>
    <p>{welcome.track.body}</p>
    <button class="btn" onclick={() => go('/track')}>{inPlay ? welcome.track.resume : welcome.track.start}</button>
  </div>
  <div class="card welcome-card">
    <div class="eyebrow">{welcome.tools.title}</div>
    <p>{welcome.tools.body}</p>
    <button class="btn ghost" onclick={() => go('/tools')}>{welcome.tools.open}</button>
  </div>
</section>

<label class="checkrow">
  <input type="checkbox" bind:checked={hide} onchange={() => setHideWelcome(hide)} />
  Don't show this screen on startup
</label>

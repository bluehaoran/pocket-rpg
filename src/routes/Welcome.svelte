<script lang="ts">
  import welcome from '../../content/welcome.json';
  import { app } from '../lib/session.svelte.ts';
  import { hideWelcome, setHideWelcome } from '../lib/prefs.ts';
  import Logo from '../components/Logo.svelte';
  import Toggle from '../components/Toggle.svelte';

  let showAtStart = $state(!hideWelcome());
  const inPlay = $derived(app.session?.started === true);
</script>

<section class="group">
  <h2><Logo size="34px" /></h2>
  <p class="hint welcome-intro">{welcome.intro}</p>
</section>

<!-- A hand-drawn arrow -->
{#snippet arrow()}
  <svg class="doodle" viewBox="0 0 60 120" aria-hidden="true" focusable="false">
    <path d="M31 4 C22 24 38 38 28 58 C20 74 36 86 30 108" />
    <path d="M14 90 C20 98 26 104 30 110 C36 102 42 96 48 88" />
  </svg>
{/snippet}

<Toggle label="Show me this when I start" on={showAtStart} onchange={on => { showAtStart = on; setHideWelcome(!on); }} />

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

<style>
  .welcome-cols{flex:1 0 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}
  .welcome-col{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
  .welcome-intro{color:var(--ink)}
  .welcome-col .eyebrow{font:800 22px/1 var(--f-display);letter-spacing:.06em;color:var(--ink)}
  .welcome-col p{margin:0;font-size:15px;line-height:1.4}
  .welcome-col .hand{margin-top:auto;font:700 20px/1.1 "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive;color:var(--accent);transform:rotate(-3deg)}
  .welcome-col:last-child .hand{transform:rotate(2deg)}
  .doodle{width:44px;height:88px;flex:none;fill:none;stroke:var(--accent);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}
</style>

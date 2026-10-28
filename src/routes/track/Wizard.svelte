<script lang="ts">
  import { href, router } from '../../lib/router.svelte.ts';
  import Setup from './Setup.svelte';
  import Setting from './Setting.svelte';
  import Story from './Story.svelte';
  import Players from './Players.svelte';

  const STEPS = [
    ['setup', '1 System'],
    ['setting', '2 Setting'],
    ['story', '3 Story'],
    ['players', '4 Players']
  ] as const;
  const step = $derived(STEPS.find(([id]) => id === router.route.rest[0])?.[0] ?? 'setup');
</script>

<nav class="vtabs four" aria-label="Setup steps">
  {#each STEPS as [id, label] (id)}
    <a class="steplink" href={href(`/track/${id}`)} aria-current={step === id ? 'step' : undefined}>{label}</a>
  {/each}
</nav>

{#if step === 'setup'}<Setup />{:else if step === 'setting'}<Setting />{:else if step === 'story'}<Story />{:else}<Players />{/if}

<style>
  .vtabs.four{grid-template-columns:repeat(4,1fr)}
  .vtabs.four a.steplink{font-size:13px;letter-spacing:.03em;padding:0 2px}
  .vtabs a.steplink{min-height:50px;border-radius:10px;color:var(--muted);font:700 16px/1 var(--f-body);text-transform:uppercase;letter-spacing:.08em;display:flex;align-items:center;justify-content:center;text-decoration:none;text-align:center}
  .vtabs a.steplink[aria-current="step"]{background:var(--surface);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.15)}
</style>

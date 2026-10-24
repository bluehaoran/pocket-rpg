<script lang="ts">
  import { href, router } from '../../lib/router.svelte.ts';
  import Setup from './Setup.svelte';
  import Story from './Story.svelte';
  import Players from './Players.svelte';

  const STEPS = [
    ['setup', '1 Setup'],
    ['story', '2 Story'],
    ['players', '3 Players']
  ] as const;
  const step = $derived(STEPS.find(([id]) => id === router.route.rest[0])?.[0] ?? 'setup');
</script>

<nav class="vtabs three" aria-label="Setup steps">
  {#each STEPS as [id, label] (id)}
    <a class="steplink" href={href(`/track/${id}`)} aria-current={step === id ? 'step' : undefined}>{label}</a>
  {/each}
</nav>

{#if step === 'setup'}<Setup />{:else if step === 'story'}<Story />{:else}<Players />{/if}

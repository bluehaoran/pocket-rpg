<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import Wizard from './track/Wizard.svelte';
  import Play from './track/Play.svelte';
</script>

{#if app.session?.started}
  <Play />
{:else}
  <Wizard />
{/if}

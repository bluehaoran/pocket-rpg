<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { rulesKind } from '../lib/characters.ts';
  import GmControl from './GmControl.svelte';
  import KinGmControl from './KinGmControl.svelte';

  /** The "opposed by GM" control for the session's rules system. Lasers & Feelings has none. */
  const kind = $derived(rulesKind(app.session!.rulesId));
</script>

{#if kind === 'kin'}<KinGmControl />{:else if kind === 'rfs'}<GmControl />{/if}

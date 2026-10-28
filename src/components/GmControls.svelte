<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { isKin, isRfs } from '../lib/characters.ts';
  import GmControl from './GmControl.svelte';
  import KinGmControl from './KinGmControl.svelte';

  /** The "opposed by GM" control for the session's rules system. Lasers & Feelings has none. */
  const rulesId = $derived(app.session!.rulesId);
</script>

{#if isKin(rulesId)}<KinGmControl />{:else if isRfs(rulesId)}<GmControl />{/if}

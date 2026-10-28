<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { isKin, isRfs } from '../lib/characters.ts';
  import KinControls from './KinControls.svelte';
  import LfControls from './LfControls.svelte';
  import RfsControls from './RfsControls.svelte';

  /** The roll controls for the session's rules system. */
  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const rulesId = $derived(app.session!.rulesId);
</script>

{#if isKin(rulesId)}<KinControls {ci} {compact} />{:else if isRfs(rulesId)}<RfsControls {ci} {compact} />{:else}<LfControls {ci} {compact} />{/if}

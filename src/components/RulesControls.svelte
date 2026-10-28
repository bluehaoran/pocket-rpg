<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { rulesKind } from '../lib/characters.ts';
  import KinControls from './KinControls.svelte';
  import LfControls from './LfControls.svelte';
  import RfsControls from './RfsControls.svelte';

  /** The roll controls for the session's rules system. */
  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const kind = $derived(rulesKind(app.session!.rulesId));
</script>

{#if kind === 'kin'}<KinControls {ci} {compact} />{:else if kind === 'rfs'}<RfsControls {ci} {compact} />{:else}<LfControls {ci} {compact} />{/if}

<script lang="ts">
  import type { Snippet } from 'svelte';

  // A field and its 58px button side by side. `row` aligns to the top (a field that may grow); `gmrow` centres.
  let { variant = 'row', children }: { variant?: 'row' | 'gmrow'; children: Snippet } = $props();
</script>

<div class={variant}>{@render children()}</div>

<style>
  .row, .gmrow{display:grid;grid-template-columns:minmax(0,1fr) 58px;gap:8px}
  .row{align-items:start}
  .gmrow{align-items:center}
</style>

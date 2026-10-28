<!-- The PocketRPG logo, with icon and highlighted RPG -->
<script lang="ts">
  import Mark from './Mark.svelte';

  /** Font size of the wordmark; the mark scales with it. */
  let { size = '24px' }: { size?: string } = $props();
</script>

<div class="logo" style:--logo-size={size}><Mark /><span>Pocket<b>RPG</b></span></div>

<style>
  .logo b{color:var(--accent);font-weight:inherit}
  .logo {display:flex;align-items:center;font:800 var(--logo-size)/1 var(--f-display);text-transform:uppercase;letter-spacing:.02em}
</style>

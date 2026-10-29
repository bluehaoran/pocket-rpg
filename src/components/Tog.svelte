<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  // A toggle chip. Selected chips fill with ink and also show a check, so the state reads without colour.
  let { pressed, onclick, children }: { pressed: boolean; onclick: () => void; children: Snippet } = $props();
</script>

<button type="button" class="tog" aria-pressed={pressed} {onclick}>
  {#if pressed}<Icon name="check" size="1em" stroke={3} />{/if}{@render children()}
</button>

<script lang="ts">
  import type { Snippet } from 'svelte';

  // Sticks to the bottom of the scrolling screen so its buttons stay under the thumb.
  let { one = false, children }: { one?: boolean; children: Snippet } = $props();
</script>

<div class="dock" class:one>{@render children()}</div>

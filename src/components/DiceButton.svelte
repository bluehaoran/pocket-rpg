<script lang="ts">
  import type { Snippet } from 'svelte';

  // The square 58px button beside a field that fills it with a random value. Its face is a die or icon.
  let { label, onclick, children }: { label: string; onclick: () => void; children: Snippet } = $props();
</script>

<button class="dice" aria-label={label} {onclick}>{@render children()}</button>

<style>
  .dice{width:58px;height:58px;border-radius:12px;border:2px solid var(--line);background:var(--sunk);display:grid;place-items:center}
  .dice:active{transform:scale(.94)}
</style>

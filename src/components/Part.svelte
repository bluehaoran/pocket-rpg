<script lang="ts">
  import type { Snippet } from 'svelte';

  // An underlined tappable word inside a sentence, with a 44px hit area that doesn't disturb the line.
  let { empty = false, label, onclick, children }: { empty?: boolean; label?: string; onclick: () => void; children: Snippet } = $props();
</script>

<button class="part" class:empty aria-label={label} {onclick}>{@render children()}</button>

<style>
  .part{all:unset;cursor:pointer;color:var(--accent);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px;border-radius:4px;padding:10px 6px;margin:-10px -6px}
  .part:focus-visible{outline:var(--ring);outline-offset:2px}
  .part.empty{color:var(--muted);text-decoration-style:dashed}
</style>

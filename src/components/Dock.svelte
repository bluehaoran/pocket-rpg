<script lang="ts">
  import type { Snippet } from 'svelte';

  // Sticks to the bottom of the scrolling screen so its buttons stay under the thumb.
  let { one = false, children }: { one?: boolean; children: Snippet } = $props();
</script>

<div class="dock" class:one>{@render children()}</div>

<style>
  .dock{position:sticky;bottom:-28px;margin:auto -16px -28px;padding:10px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;border-top:1px solid var(--line);background:var(--bg)}
  .dock.one{grid-template-columns:2fr 1fr}
  .dock:empty{display:none}
  .dock :global(button){min-height:56px;border-radius:14px;border:2px solid var(--ink);background:var(--surface);font:700 21px/1 var(--f-mono);display:flex;align-items:center;justify-content:center;gap:8px}
  .dock :global(button):active{transform:scale(.97)}
  .dock :global(.btn){background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font:800 23px/1 var(--f-display)}
  .dock :global(.btn.reroll){background:var(--surface);color:var(--accent)}
</style>

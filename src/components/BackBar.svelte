<script lang="ts">
  /** "‹ Label" back control with an optional eyebrow on the right. A link when `href` is set, else a button. */
  let { label, href, onclick, title }: { label: string; href?: string; onclick?: () => void; title?: string } = $props();
</script>

<div class="toolhead">
  {#if href}
    <a class="back" {href}>‹ {label}</a>
  {:else}
    <button class="back" {onclick}>‹ {label}</button>
  {/if}
  {#if title}<span class="eyebrow">{title}</span>{/if}
</div>

<style>
  a.back{text-decoration:none}
  .toolhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:-10px}
  .back{min-height:44px;border:0;background:none;padding:0 4px 0 0;font:700 17px var(--f-body);color:var(--accent)}
</style>

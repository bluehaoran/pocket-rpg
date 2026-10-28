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

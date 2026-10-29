<script lang="ts">
  // A big radio-style choice card: a button that selects, or a link when `href` is set.
  let { title, meta, more, pressed = false, err = false, href, onclick }: {
    title: string;
    meta: string;
    /** A longer line under the meta text. */
    more?: string;
    pressed?: boolean;
    /** Meta text in the error colour. */
    err?: boolean;
    href?: string;
    onclick?: () => void;
  } = $props();
</script>

{#snippet inner()}
  <span class="radio"></span><span class="t">{title}</span><span class="m" class:err>{meta}</span>
  {#if more}<span class="m more">{more}</span>{/if}
{/snippet}

{#if href}
  <a class="opt" {href}>{@render inner()}</a>
{:else}
  <button class="opt" aria-pressed={pressed} {onclick}>{@render inner()}</button>
{/if}

<style>
  .opt{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;align-items:center;text-align:left;width:100%;min-height:68px;padding:12px 16px;border:2px solid var(--line);border-radius:14px;background:var(--surface)}
  .opt[aria-pressed="true"]{border-color:var(--sel);background:var(--sunk)}
  .opt:disabled{opacity:.5;cursor:not-allowed}
  .radio{width:24px;height:24px;border-radius:50%;border:2px solid var(--muted);grid-row:span 2}
  .opt[aria-pressed="true"] .radio{border:8px solid var(--sel)}
  .opt .t{font-weight:700;font-size:19px}
  .opt .m{font:500 12px/1.3 var(--f-mono);color:var(--muted)}
  .opt .m.err{color:var(--danger)}
  .opt .m.more{grid-column:2;font:400 14px/1.35 var(--f-body);color:var(--ink)}
  a.opt{text-decoration:none;color:inherit}
</style>

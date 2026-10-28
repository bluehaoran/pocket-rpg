<script lang="ts">
  /** Breadcrumb heading: the parent as a link, then the current page. */
  let { parent, href, current }: { parent: string; href: string; current: string } = $props();
</script>

<h2><a class="crumb" {href}>{parent}</a><span class="sep" aria-hidden="true">›</span>{current}</h2>

<style>
  h2 .crumb{color:var(--accent);text-decoration:none;display:inline-block;padding:8px 0;margin:-8px 0}
  h2 .sep{color:var(--muted);margin-inline:.25em}
</style>

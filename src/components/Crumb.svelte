<script lang="ts">
  /** Breadcrumb heading: the parent as a link, then the current page. */
  let { parent, href, current }: { parent: string; href: string; current: string } = $props();
</script>

<h2><a class="crumb" {href}>{parent}</a><span class="sep" aria-hidden="true">›</span>{current}</h2>

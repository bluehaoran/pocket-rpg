<script lang="ts">
  import { registry } from '../lib/content/index.ts';
  import { href } from '../lib/router.svelte.ts';

  let { toolId }: { toolId: string } = $props();
  const tool = $derived(registry.tools.find(t => t.id === toolId));
</script>

<div class="toolhead">
  <a class="back" href={href('/tools')} style="text-decoration:none">‹ Tools</a>
  <span class="eyebrow">Tool</span>
</div>
<h2>{tool?.label ?? 'Unknown tool'}</h2>
<div class="empty-card">
  {#if tool}
    Tool pages (roll on open, Reroll, remembered modifiers) are milestone M3.
  {:else}
    No tool with id <code>{toolId}</code> in <code>content/tools/registry.json</code>.
  {/if}
</div>

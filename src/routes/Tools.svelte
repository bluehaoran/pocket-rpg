<script lang="ts">
  import { registry, lists } from '../lib/content/index.ts';
  import { href } from '../lib/router.svelte.ts';
  import type { ToolDef } from '../lib/content/types.ts';

  function sub(t: ToolDef): string {
    if (t.kind === 'dice') return `${t.dice?.count.default ?? 1}d${t.dice?.defaultType ?? 6}`;
    const n = lists[t.list ?? '']?.entries.length ?? 0;
    return n ? `${n} entries` : 'Empty list';
  }
</script>

<section class="group">
  <div class="eyebrow">Game master tools</div>
  <h2>Tools</h2>
</section>

<section class="gens">
  {#each registry.tools as t (t.id)}
    <a class="gen" href={href(`/tools/${t.id}`)} style="color:inherit;text-decoration:none">
      <b>{t.label}</b><small>{sub(t)}</small>
    </a>
  {/each}
</section>

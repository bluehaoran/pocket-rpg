<script lang="ts">
  import { registry } from '../lib/content/index.ts';
  import { href } from '../lib/router.svelte.ts';
  import { app } from '../lib/session.svelte.ts';
  import { toolPack, toolCtx } from '../lib/toolctx.svelte.ts';
  import { packTools, toolSub, type AnyTool } from '../lib/tools.ts';

  const pack = $derived(toolPack());
  const gens = $derived(packTools(pack));
  const sub = (t: AnyTool) => toolSub(t, app.session?.toolModifiers[t.id] ?? {}, toolCtx());
</script>

<section class="group">
  <h2>Tools</h2>
  <p class="hint">Game master tools</p>
</section>

<section class="gens">
  {#each registry.tools as t (t.id)}
    {@const s = sub(t)}
    <a class="gen" class:req={/^(Choose|Empty|All hidden)/.test(s)} href={href(`/tools/${t.id}`)}>
      <b>{t.label}</b><small>{s}</small>
    </a>
  {/each}
</section>

{#if gens.length}
  <section class="group">
    <div class="eyebrow">{pack?.genre ?? pack?.name} pack</div>
    <div class="gens">
      {#each gens as t (t.id)}
        {@const s = sub(t)}
        <a class="gen" class:req={/^Choose/.test(s)} href={href(`/tools/${encodeURIComponent(t.id)}`)}>
          <b>{t.label}</b><small>{s}</small>
        </a>
      {/each}
    </div>
  </section>
{/if}

<a class="btn ghost" href={href('/tools/history')}>History · {app.session?.toolHistory.length ?? 0}</a>

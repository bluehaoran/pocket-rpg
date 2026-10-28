<script lang="ts">
  import { packs, rawPacks } from '../lib/content/index.ts';
  import { validatePack } from '../lib/content/validate.ts';
  import { href } from '../lib/router.svelte.ts';
  import BackBar from '../components/BackBar.svelte';

  let { packId }: { packId?: string } = $props();
  const pack = $derived(packId ? packs[packId] : undefined);
  const report = $derived(pack ? validatePack(pack) : undefined);
  const all = Object.values(packs).sort((a, b) => a.name.localeCompare(b.name));
</script>

{#if pack && report}
  <BackBar href={href('/packs')} label="Packs" />
  <section class="group">
    <div class="eyebrow">{pack.library ? 'Library pack' : (pack.genre ?? '')}</div>
    <h2>{pack.name}</h2>
    <p class="hint">
      {String(pack.provenance?.author ?? '')}{pack.provenance?.license ? ' · ' + String(pack.provenance.license) : ''}
    </p>
  </section>
  <section class="group">
    <div class="eyebrow">Validation</div>
    <ul class="check">
      {#each report.errors as e (e)}<li class="err">{e}</li>{/each}
      {#if !report.errors.length}<li>OK · {report.tables} tables · {report.entries} entries</li>{/if}
    </ul>
  </section>
  <section class="group">
    <div class="eyebrow">Pack JSON{pack.extends?.length ? ' · extends ' + pack.extends.join(', ') : ''}</div>
    <pre class="card" style="overflow:auto;max-height:55vh;font:500 12px/1.5 var(--f-mono);padding:12px">{JSON.stringify(rawPacks[pack.id], null, 2)}</pre>
  </section>
{:else}
  <BackBar href={href('/track')} label="Back" />
  <section class="group">
    <div class="eyebrow">Installed</div>
    <h2>Packs</h2>
  </section>
  <section class="group">
    {#each all as p (p.id)}
      {@const r = validatePack(p)}
      <a class="opt" href={href(`/packs/${p.id}`)}>
        <span class="radio"></span>
        <span class="t">{p.genre ?? p.name}</span>
        <span class="m" class:err={r.errors.length > 0}>
          {p.name} v{p.version}{p.library ? ' · library' : ''} · {r.tables} tables{r.errors.length ? ` · ${r.errors.length} errors` : ''}
        </span>
      </a>
    {/each}
  </section>
{/if}

<style>
  .check{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;font-size:15px}
  .check li{padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line)}
  .check li.err{border-color:#C0392B}
</style>

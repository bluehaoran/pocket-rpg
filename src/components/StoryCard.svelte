<script lang="ts">
  import { packs } from '../lib/content/index.ts';
  import { href } from '../lib/router.svelte.ts';
  import { app, mutate } from '../lib/session.svelte.ts';
  import { groupFieldsOf, isEmptyValue, showValue, type FieldValue } from '../lib/characters.ts';
  import { display, fieldDef, type FieldRef } from '../lib/fields.ts';
  import { rerollSeedColumn } from '../lib/setup.ts';
  import { log } from '../lib/play.svelte.ts';
  import { mathRng } from '../lib/engine/rng.ts';
  import { shortLabel } from '../lib/engine/template.ts';
  import { buzz } from '../lib/device.ts';
  import DRow from './DRow.svelte';
  import FieldSheet from './FieldSheet.svelte';

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const seed = $derived(pack.seed);
  const qs = $derived(pack.story?.questions ?? []);
  const gf = $derived(groupFieldsOf(pack));
  let editing = $state<FieldRef | null>(null);

  const reroll = (i: number) => {
    mutate(x => rerollSeedColumn(x, pack, i, mathRng));
    log('edit', null, `Story: ${app.session?.seed?.text ?? ''}`);
    buzz();
  };
  const parts = $derived(seed ? seed.template.split(/(\{\d+\})/).filter(Boolean) : []);
  const colValue = (i: number) => {
    const v = s.seed?.columns[i] ?? '';
    return seed?.columns[i]?.case === 'lower' ? v.charAt(0).toLowerCase() + v.slice(1) : v;
  };

  /** Editing the story card is logged once, when the sheet closes. */
  function closed(before: FieldValue) {
    const ref = editing;
    editing = null;
    if (!ref) return;
    const after = ref.scope === 'q' ? (s.answers[ref.id] ?? '') : (s.group[ref.id] ?? '');
    if (JSON.stringify(after) === JSON.stringify(before)) return;
    const f = fieldDef(pack, s.rulesId, ref);
    const fmt = (v: unknown) => (isEmptyValue(v) ? '(blank)' : showValue(v));
    log('edit', null, `${shortLabel(f?.label ?? ref.id)}: ${fmt(before)} → ${fmt(after)}`);
  }
</script>

<section class="group">
  <div class="eyebrow">Story · {pack.genre ?? pack.name}</div>
  <div class="card story">
    {#if seed && s.seed}
      <p class="seedline">
        {#each parts as part, j (j)}
          {@const m = part.match(/^\{(\d+)\}$/)}
          {#if m}<button class="part" aria-label="Reroll {seed.columns[Number(m[1])]?.label}" onclick={() => reroll(Number(m[1]))}>{colValue(Number(m[1]))}</button>{:else}{part}{/if}
        {/each}
      </p>
    {/if}
    {#if qs.length || gf.length}
      <div class="drows" style={seed && s.seed ? '' : 'border-top:0'}>
        {#each qs as q (q.id)}
          <DRow question label={q.text} value={display(s.answers[q.id])} empty="Not answered" onclick={() => (editing = { scope: 'q', id: q.id })} />
        {/each}
        {#each gf as f (f.id)}
          <DRow label={shortLabel(f.label)} value={display(s.group[f.id])} onclick={() => (editing = { scope: 'group', id: f.id })} />
        {/each}
      </div>
    {/if}
    {#if !(seed && s.seed) && !qs.length && !gf.length}
      <p class="hint" style="padding:12px 0">{pack.name} has no story seed.</p>
    {/if}
  </div>
  {#if pack.generators?.length}
    <ul class="chips gchips" aria-label="Generators">
      {#each pack.generators as g (g.id)}
        <li><a class="tog" href={href(`/tools/${encodeURIComponent('pack:' + g.id)}`)} style="text-decoration:none;color:inherit">{g.label} ›</a></li>
      {/each}
    </ul>
  {/if}
</section>

{#if editing}
  <FieldSheet fieldRef={editing} onclose={closed} />
{/if}

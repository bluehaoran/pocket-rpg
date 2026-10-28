<script lang="ts">
  import { onMount } from 'svelte';
  import { go } from '../../lib/router.svelte.ts';
  import { app, mutate, currentPack } from '../../lib/session.svelte.ts';
  import { groupFieldsOf } from '../../lib/characters.ts';
  import { charCtx, ensureSetup, rerollSeedColumn, rollSeed, seedFace } from '../../lib/setup.ts';
  import { display, type FieldRef } from '../../lib/fields.ts';
  import { mathRng } from '../../lib/engine/rng.ts';
  import { shortLabel } from '../../lib/engine/template.ts';
  import { buzz } from '../../lib/device.ts';
  import SeedLine from '../../components/SeedLine.svelte';
  import Die from '../../components/Die.svelte';
  import DRow from '../../components/DRow.svelte';
  import FieldSheet from '../../components/FieldSheet.svelte';
  import Icon from '../../components/Icon.svelte';

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const seed = $derived(pack.seed);
  const questions = $derived(pack.story?.questions ?? []);
  const outline = $derived(pack.story?.segments ?? []);
  const groups = $derived(groupFieldsOf(pack));

  let tab = $state<'text' | 'advanced'>('text');
  let editing = $state<FieldRef | null>(null);

  onMount(() => {
    mutate(x => {
      ensureSetup(x, charCtx(x, pack, mathRng));
      if (pack.seed && !x.seed) rollSeed(x, pack, mathRng);
    });
  });

  const rollAll = () => {
    mutate(x => rollSeed(x, pack, mathRng));
    buzz();
  };
  const reroll = (i: number) => {
    mutate(x => rerollSeedColumn(x, pack, i, mathRng));
    buzz();
  };
  const genLabel = (id: string) => pack.generators?.find(g => g.id === id)?.label ?? id;
</script>

<section class="group">
  <div class="eyebrow">Step 3 of 4 · {pack.genre ?? pack.name}</div>
  <h2>Story</h2>
</section>

{#if questions.length && pack.setting?.premise}
  <section class="group"><div class="eyebrow">Premise</div><p class="premise">{pack.setting.premise}</p></section>
{/if}

{#if seed && s.seed}
  <section class="group">
    <div class="vtabs" role="tablist">
      <button role="tab" aria-selected={tab === 'text'} onclick={() => (tab = 'text')}>Text</button>
      <button role="tab" aria-selected={tab === 'advanced'} onclick={() => (tab = 'advanced')}>Advanced</button>
    </div>
    {#if tab === 'advanced'}
      <div class="cols">
        {#each seed.columns as c, i (i)}
          <button class="col" onclick={() => reroll(i)}>
            <Die value={seedFace(pack, i, s.seed.columns[i] ?? '')} />
            <span><span class="eyebrow">{c.label}</span><br /><span class="val">{s.seed.columns[i]}</span></span>
            <span class="re" aria-hidden="true"><Icon name="reroll" /></span>
          </button>
        {/each}
      </div>
      <p class="hint">Each part is a d6 table. Tap a row to reroll only that part.</p>
    {:else}
      <div class="sentence">
        <SeedLine {seed} values={s.seed.columns} onreroll={reroll} />
      </div>
      <p class="hint">Tap an underlined part to reroll only that part.</p>
    {/if}
    <button class="btn ghost" onclick={rollAll}>Reroll all <Icon name="reroll" /></button>
  </section>
{:else if !seed && !questions.length}
  <div class="empty-card">{pack.name} has no story seed table.</div>
{/if}

{#if questions.length}
  <section class="group">
    <div class="eyebrow">Introduction · ask the table</div>
    <div class="card">
      <div class="drows" style="border-top:0">
        {#each questions as q (q.id)}
          <DRow question label={q.text} value={display(s.answers[q.id])} empty="Ask aloud, or tap to note the answer"
            onclick={() => (editing = { scope: 'q', id: q.id })} />
        {/each}
      </div>
    </div>
  </section>
{/if}

{#if groups.length}
  <section class="group">
    <div class="eyebrow">Shared by the party</div>
    <div class="card">
      <div class="drows" style="border-top:0">
        {#each groups as f (f.id)}
          <DRow label={shortLabel(f.label)} value={display(s.group[f.id])} onclick={() => (editing = { scope: 'group', id: f.id })} />
        {/each}
      </div>
    </div>
  </section>
{/if}

{#if outline.length}
  <section class="group">
    <div class="eyebrow">Session outline · {outline.length} scenes</div>
    <ol class="outline">
      {#each outline as sg (sg.name)}
        <li>
          <b>{sg.name}</b><span>{sg.text}</span>
          {#if sg.tables?.length}<span class="rolls">Roll: {#each sg.tables as t (t)}<i>{genLabel(t)}</i>{/each}</span>{/if}
        </li>
      {/each}
    </ol>
    {#if pack.story?.note}<p class="hint">{pack.story.note}</p>{/if}
  </section>
{/if}

{#if !questions.length && pack.setting?.premise}
  <section class="group"><div class="eyebrow">Premise</div><p class="premise">{pack.setting.premise}</p></section>
{/if}

<button class="btn" onclick={() => go('/track/players')}>Players <Icon name="arrow-right" stroke={4} /></button>

{#if editing}
  <FieldSheet fieldRef={editing} onclose={() => (editing = null)} />
{/if}

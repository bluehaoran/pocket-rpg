<script lang="ts">
  // One character: sentence, number bar, stats and fields for Lasers & Feelings; sentence, XP,
  // fields and skill tree for Roll for Shoes; sentence and skills for Kintsugi. `onedit` makes
  // parts tappable; without it the card is read-only.
  import { app, currentPack } from '../lib/session.svelte.ts';
  import {
    derive, fieldsOf, kinFlavour, lfChecks, lfFlavour, numberField, numberRange, rulesKind, sentenceFor, skillTree
  } from '../lib/characters.ts';
  import { kinSkills } from '../lib/rules/kintsugi.ts';
  import { display, type FieldRef } from '../lib/fields.ts';
  import { shortLabel, usedFieldIds } from '../lib/engine/template.ts';
  import Sentence from './Sentence.svelte';
  import ScaleBar from './ScaleBar.svelte';
  import DRow from './DRow.svelte';
  import KinSkillList from './KinSkillList.svelte';
  import RfsSkillTree from './RfsSkillTree.svelte';

  let { index, onedit }: { index: number; onedit?: (ref: FieldRef) => void } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[index]);
  const kind = $derived(rulesKind(s.rulesId));
  const lf = $derived(lfFlavour(pack));
  const fields = $derived(fieldsOf(pack, s.rulesId));
  const template = $derived(sentenceFor(pack, s.rulesId));
  // The sentence shows these fields; the rest are listed as rows below it.
  const used = $derived(usedFieldIds(template, fields));
  const numF = $derived(numberField(fields));
  const { under, over } = $derived(lfChecks(lf));

  const rest = $derived(
    fields.filter(f => !used.has(f.id) && f.kind !== 'number' && !(kind === 'rfs' && (f.skill || (f.status && !f.status.optional))))
  );
  // The little "Label value" chips under the sentence.
  const stats = $derived.by((): { k: string; v: string }[] => {
    if (!c) return [];
    if (kind === 'kin') return [{ k: 'Skills', v: String(kinSkills(kinFlavour(pack), c).filter(k => !k.out).length) }];
    if (kind === 'rfs') return [{ k: 'XP', v: String(c.xp ?? 0) }, { k: 'Skills', v: String(skillTree(pack, c).length) }];
    return [
      ...derive(pack, c).filter(d => d.v != null).map(d => ({ k: shortLabel(d.label), v: String(d.v) })),
      ...(lf.resources ?? []).filter(r => c.resources[r.id] != null).map(r => ({ k: r.label, v: `${c.resources[r.id]}/${r.max}` }))
    ];
  });
  const edit = (id: string) => onedit?.({ scope: 'char', id, ci: index });
</script>

{#if c}
  <section class="group">
    <div class="sentence crew">
      <Sentence template={template} {fields} values={c.fields} onpick={onedit ? edit : undefined} plain={!onedit} />
      {#if kind === 'lf' && numF && typeof c.fields[numF.id] === 'number' && under && over}
        <ScaleBar n={c.fields[numF.id] as number} range={numberRange(lf, numF)}
          over={over.label} under={under.label} onclick={onedit ? () => edit(numF.id) : undefined} />
      {/if}
      {#if stats.length}
        <div class="stats">{#each stats as st (st.k)}<span class="stat">{st.k} <b>{st.v}</b></span>{/each}</div>
      {/if}
    </div>
    {#if rest.length}
      <div class="card">
        <div class="drows" style="border-top:0">
          {#each rest as f (f.id)}
            <DRow label={shortLabel(f.label)} value={display(c.fields[f.id])}
              onclick={() => edit(f.id)} />
          {/each}
        </div>
      </div>
    {/if}
    {#if onedit}<p class="hint">Tap any part to change it.</p>{/if}
  </section>

  {#if kind === 'kin'}
    <KinSkillList {index} editable={!!onedit} />
  {:else if kind === 'rfs'}
    <RfsSkillTree {index} {onedit} />
  {/if}
{/if}

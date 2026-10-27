<script lang="ts">
  // One character: sentence, number bar, stats and fields for Lasers & Feelings; sentence, XP,
  // fields and skill tree for Roll for Shoes. `onedit` makes parts tappable; without it the card is read-only.
  import { packs } from '../lib/content/index.ts';
  import { app } from '../lib/session.svelte.ts';
  import {
    derive, fieldsOf, isKin, isRfs, kinFlavour, lfFlavour, rfsFlavour, skillTree, statuses
  } from '../lib/characters.ts';
  import { kinSkills } from '../lib/rules/kintsugi.ts';
  import { display, type FieldRef } from '../lib/fields.ts';
  import { defaultSentence, shortLabel } from '../lib/engine/template.ts';
  import Sentence from './Sentence.svelte';
  import ScaleBar from './ScaleBar.svelte';
  import DRow from './DRow.svelte';

  let { index, onedit }: { index: number; onedit?: (ref: FieldRef) => void } = $props();

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const c = $derived(s.characters[index]);
  const rfs = $derived(isRfs(s.rulesId));
  const lf = $derived(lfFlavour(pack));
  const rf = $derived(rfsFlavour(pack));
  const kin = $derived(isKin(s.rulesId));
  const kf = $derived(kinFlavour(pack));
  const fields = $derived(fieldsOf(pack, s.rulesId));
  const template = $derived((kin ? kf.sentence : rfs ? rf.sentence : lf.sentence) ?? defaultSentence(s.rulesId, fields.map(f => f.id)));
  let used = $state(new Set<string>());
  const numF = $derived(fields.find(f => f.kind === 'number'));
  const under = $derived(lf.checks.find(x => x.roll === 'under'));
  const over = $derived(lf.checks.find(x => x.roll === 'over'));

  const rest = $derived(
    fields.filter(f => !used.has(f.id) && f.kind !== 'number' && !(rfs && (f.skill || (f.status && !f.status.optional))))
  );
  const stats = $derived(
    !c || rfs || kin
      ? []
      : [
          ...derive(pack, c).filter(d => d.v != null).map(d => ({ k: shortLabel(d.label), v: String(d.v) })),
          ...(lf.resources ?? []).filter(r => c.resources[r.id] != null).map(r => ({ k: r.label, v: `${c.resources[r.id]}/${r.max}` }))
        ]
  );
  const tree = $derived(c && rfs ? skillTree(pack, c) : []);
  const sts = $derived(c && rfs ? statuses(pack, c) : []);
  const kskills = $derived(c && kin ? kinSkills(kf, c) : []);
  const edit = (id: string) => onedit?.({ scope: 'char', id, ci: index });
</script>

{#if c}
  <section class="group">
    <div class="sentence crew">
      <Sentence template={template} {fields} values={c.fields} onpick={onedit ? edit : undefined} plain={!onedit} bind:used />
      {#if !rfs && !kin && numF && typeof c.fields[numF.id] === 'number' && under && over}
        <ScaleBar n={c.fields[numF.id] as number} range={(numF.range ?? lf.numberRange ?? [2, 5]) as [number, number]}
          over={over.label} under={under.label} onclick={onedit ? () => edit(numF.id) : undefined} />
      {/if}
      {#if kin}
        <div class="stats"><span class="stat">Skills <b>{kskills.filter(k => !k.out).length}</b></span></div>
      {:else if rfs}
        <div class="stats"><span class="stat">XP <b>{c.xp ?? 0}</b></span><span class="stat">Skills <b>{tree.length}</b></span></div>
      {:else if stats.length}
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

  {#if kin}
    <section class="group">
      <div class="eyebrow">Skills</div>
      <div class="card">
        <div class="skills">
          {#each kskills as sk (sk.key)}
            <div class="skill" class:out={sk.out}>
              <span class="tw" aria-hidden="true"></span>
              <span class="sn">{sk.name}{#if sk.out}<small>Crossed out</small>{:else if !sk.root}<small>Earned in play</small>{/if}</span>
              <span class="lv">{sk.level}</span><span></span>
            </div>
          {/each}
        </div>
      </div>
      {#if onedit}
        <p class="hint">Roll a die at or under a skill to succeed. Failing "{kf.rootSkill ?? 'Do Anything'}" teaches a new skill; failing any other skill raises it by one, and at 6 it is crossed out.</p>
      {/if}
    </section>
  {:else if rfs}
    <section class="group">
      <div class="eyebrow">Skills</div>
      <div class="card">
        <div class="skills">
          {#each tree as sk (sk.key)}
            {#if sk.root}
              <div class="skill root"><span class="sn">{sk.name}</span><span class="lv">{sk.level}<small>d6</small></span></div>
            {:else if sk.earned != null}
              <div class="skill child earned" style="--dep:{sk.depth}">
                <span class="tw" aria-hidden="true">└</span>
                <span class="sn">{sk.name}<small>Earned in play</small></span>
                <span class="lv">{sk.level}<small>d6</small></span><span></span>
              </div>
            {:else}
              {@const ref = sk.field ? { scope: 'char' as const, id: sk.field, ci: index } : { scope: 'skill' as const, id: String(sk.extra), ci: index }}
              {#snippet skillInner()}
                <span class="tw" aria-hidden="true">└</span>
                <span class="sn" class:empty={!sk.name}>{sk.name || 'Name this skill'}{#if sk.label}<small>{sk.label}</small>{/if}</span>
                <span class="lv">{sk.level}<small>d6</small></span>
                {#if onedit}<span class="chev" aria-hidden="true">›</span>{:else}<span></span>{/if}
              {/snippet}
              {#if onedit}
                <button class="skill child" onclick={() => onedit(ref)}>{@render skillInner()}</button>
              {:else}
                <div class="skill child">{@render skillInner()}</div>
              {/if}
            {/if}
          {/each}
          {#each sts as t (t.field)}
            {#snippet statusInner()}
              <span class="tw" aria-hidden="true">!</span>
              <span class="sn">{t.text}{#if t.optional}<small>GM may apply</small>{/if}</span>
              <span class="lv neg">{t.level}</span>
              {#if onedit}<span class="chev" aria-hidden="true">›</span>{:else}<span></span>{/if}
            {/snippet}
            {#if onedit}
              <button class="skill child status" onclick={() => edit(t.field)}>{@render statusInner()}</button>
            {:else}
              <div class="skill child status">{@render statusInner()}</div>
            {/if}
          {/each}
        </div>
      </div>
      {#if onedit}
        <p class="hint">
          {tree.length > 1 ? 'Tap a skill to change it. ' : ''}New skills are earned in play: when every die shows 6, the player names a skill one level higher.
        </p>
      {/if}
    </section>
  {/if}
{/if}

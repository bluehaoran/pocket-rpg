<script lang="ts">
  import { untrack } from 'svelte';
  import { app, mutate } from '../lib/session.svelte.ts';
  import { sessionPack } from '../lib/toolctx.svelte.ts';
  import { lfFlavour, type FieldValue } from '../lib/characters.ts';
  import { canRandomFor, fieldDef, getVal, listFor, randomFor, setVal, type FieldRef } from '../lib/fields.ts';
  import { charCtx } from '../lib/setup.ts';
  import { mathRng } from '../lib/engine/rng.ts';
  import { shortLabel } from '../lib/engine/template.ts';
  import { buzz } from '../lib/device.ts';
  import Sheet from './Sheet.svelte';
  import Die from './Die.svelte';

  /** `onclose` gets the value the field had when the sheet opened, so callers can log an edit. */
  let { fieldRef, onclose }: { fieldRef: FieldRef; onclose: (before: FieldValue) => void } = $props();

  const s = $derived(app.session!);
  const pack = $derived(sessionPack()!);
  const f = $derived(fieldDef(pack, s.rulesId, fieldRef));
  const value = $derived(getVal(s, fieldRef));
  const list = $derived(f ? (f.values && !f.table ? f.values : listFor(s, pack, fieldRef, f)) : null);
  const randomisable = $derived(canRandomFor(pack, s.rulesId, fieldRef));
  const lf = $derived(lfFlavour(pack));
  // Captured once, when the sheet opens.
  const before = untrack(() => $state.snapshot(getVal(app.session!, fieldRef)));

  function set(v: FieldValue) {
    mutate(x => setVal(x, pack, fieldRef, v));
  }
  function randomise() {
    mutate(x => setVal(x, pack, fieldRef, randomFor(x, charCtx(x, pack, mathRng), fieldRef)));
    buzz();
  }
  const setMulti = (i: number, v: string) => {
    const arr = Array.isArray(value) ? [...value] : [];
    arr[i] = v;
    set(arr);
  };
  const opts = (cur: string) => (!cur || list?.includes(cur) ? (list ?? []) : [cur, ...(list ?? [])]);
  const under = $derived(lf.checks.find(c => c.roll === 'under'));
  const over = $derived(lf.checks.find(c => c.roll === 'over'));
  const range = $derived((f?.range ?? lf.numberRange ?? [2, 5]) as [number, number]);
</script>

{#if f}
  <Sheet title={f.label} onclose={() => onclose(before)}>
    <div class="row">
      {#if f.kind === 'number'}
        <div class="seg" role="group" aria-label={shortLabel(f.label)}>
          {#each Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i) as n (n)}
            <button type="button" aria-pressed={value === n} onclick={() => set(n)}>{n}</button>
          {/each}
        </div>
      {:else if f.kind === 'multi'}
        <div class="stack">
          {#each Array.from({ length: f.count ?? 2 }, (_, i) => i) as i (i)}
            {@const cur = Array.isArray(value) ? (value[i] ?? '') : ''}
            <div class="sel">
              <select aria-label="{f.label} {i + 1}" value={cur} onchange={e => setMulti(i, e.currentTarget.value)}>
                {#if !cur}<option value="">Choose…</option>{/if}
                {#each opts(cur) as o (o)}<option value={o}>{o}</option>{/each}
              </select>
            </div>
          {/each}
        </div>
      {:else if f.kind === 'pick'}
        {@const cur = String(value ?? '')}
        <div class="sel">
          <select aria-label={f.label} value={cur} onchange={e => set(e.currentTarget.value)}>
            {#if !cur}<option value="">Choose…</option>{/if}
            {#each opts(cur) as o (o)}<option value={o}>{o}</option>{/each}
          </select>
        </div>
      {:else if f.kind === 'pick-or-text'}
        {@const cur = String(value ?? '')}
        {@const listed = (list ?? []).includes(cur)}
        <div class="stack">
          <div class="sel">
            <select aria-label={f.label} value={listed ? cur : ''} onchange={e => set(e.currentTarget.value)}>
              <option value="">{listed ? 'Choose…' : 'Choose from the list…'}</option>
              {#each list ?? [] as o (o)}<option value={o}>{o}</option>{/each}
            </select>
          </div>
          <input class="free" aria-label="{f.label}, write your own" placeholder="Or write your own" autocomplete="off"
            value={listed ? '' : cur} oninput={e => set(e.currentTarget.value)} />
        </div>
      {:else}
        <input aria-label={f.label} placeholder={shortLabel(f.label)} autocomplete="off" value={String(value ?? '')}
          oninput={e => set(e.currentTarget.value)} />
      {/if}
      {#if randomisable}
        <button class="dice" aria-label="Random {shortLabel(f.label).toLowerCase()}" onclick={randomise}><Die value={5} size="sm" /></button>
      {:else}<span></span>{/if}
    </div>
    {#if f.kind === 'number' && typeof value === 'number' && under && over}
      <p class="hint">
        Higher number = better at {under.label}. {under.label}: roll under {value}. {over.label}: roll over {value}.
        Exactly {value}: {lf.exact?.name ?? 'special effect'}{lf.exact?.countsAsSuccess === false ? ' (not a success)' : ''}.
      </p>
    {/if}
    {#each [f.hint, f.note].filter(Boolean) as t (t)}<p class="hint">{t}</p>{/each}
    {#if !randomisable}<p class="hint">The source has no list for this field, so it can't be randomised.</p>{/if}
    <button class="btn" onclick={() => onclose(before)}>Done</button>
  </Sheet>
{/if}

<script module lang="ts">
  /** What the person did, so the caller can reroll when the result on screen is gone. */
  export type EntryAction = { kind: 'forever' } | { kind: 'exclude'; key: string; value: string } | { kind: 'undo' };
</script>

<script lang="ts">
  import { createConfirm } from '../lib/confirm.svelte.ts';
  import { lists } from '../lib/content/index.ts';
  import { editsState, updateEdits } from '../lib/edits.svelte.ts';
  import {
    emptyEdits, excludeTag, exclusionChoices, exclusionLabel, exclusionPhrase, exclusionsOf, hideEverywhere, hideText, unexcludeTag, unhideText,
    type Exclusion
  } from '../lib/edits.ts';
  import Sheet from './Sheet.svelte';

  let { listId, v, onclose, onact }: { listId: string; v: string; onclose: () => void; onact?: (a: EntryAction) => void } = $props();

  const list = $derived(lists[listId]);
  const edits = $derived(editsState.map[listId] ?? emptyEdits(listId));
  const hidden = $derived(edits.hidden.includes(v));
  const choices = $derived(list ? exclusionChoices(list, v, edits) : []);
  const done = $derived(exclusionsOf(edits).filter(x => x.v === v));
  const mine = $derived(edits.added.some(x => x.v === v));
  const labelOf = (x: Exclusion): string => exclusionLabel(list, x);

  const confirm = createConfirm();
  const act = (a: EntryAction, fn: Parameters<typeof updateEdits>[1]) => {
    void updateEdits(listId, fn);
    onact?.(a);
    onclose();
  };
</script>

<Sheet title="Hide this entry" {onclose}>
  <div class="who">{v}</div>

  {#if hidden}
    <button class="btn ghost" onclick={() => act({ kind: 'undo' }, e => unhideText(e, v))}>Unhide</button>
  {:else}
    <button class="btn ghost" aria-pressed={confirm.armed}
      onclick={() => list && confirm.trigger(() => act({ kind: 'forever' }, e => hideEverywhere(list, e, v)))}>
      {confirm.armed ? 'Tap again to confirm' : mine ? 'Delete this entry' : 'Never show this again'}
    </button>
    {#each choices as c (c.key)}
      <div class="eyebrow">{c.label}</div>
      {#each c.values as o (o.value)}
        <button class="btn ghost" onclick={() => act({ kind: 'exclude', key: c.key, value: o.value }, e => excludeTag(e, { v, key: c.key, value: o.value }))}>
          {exclusionPhrase(c.key, o.label)}
        </button>
      {/each}
    {/each}
  {/if}

  {#if done.length}
    <div class="eyebrow">Already hidden</div>
    {#each done as x (x.key + x.value)}
      <button class="btn ghost" aria-label="Undo: {labelOf(x)}" onclick={() => act({ kind: 'undo' }, e => unexcludeTag(e, x))}>
        Undo · {labelOf(x)}
      </button>
    {/each}
  {/if}
  <p class="hint">Saved on this device. Undo any of this in Manage Tools.</p>
</Sheet>

<style>
  .who{font:700 28px/1.2 var(--f-body);overflow-wrap:anywhere}
  .btn{font-size:17px;text-transform:none;letter-spacing:0;font-family:var(--f-body);font-weight:700}
</style>

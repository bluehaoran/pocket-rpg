<script lang="ts">
  import { lists } from '../lib/content/index.ts';
  import type { Entry } from '../lib/content/types.ts';
  import { downloadJson } from '../lib/device.ts';
  import { editsState, updateEdits } from '../lib/edits.svelte.ts';
  import { emptyEdits, hideText, removeAdded, stockRows, unhideText } from '../lib/edits.ts';
  import { exportEdits } from '../lib/editsfile.ts';
  import { href } from '../lib/router.svelte.ts';
  import AddEntrySheet from '../components/AddEntrySheet.svelte';
  import Chips from '../components/Chips.svelte';
  import ImportSheet from '../components/ImportSheet.svelte';

  let { listId }: { listId: string } = $props();

  const PAGE = 100;
  const list = $derived(lists[listId]);
  const edits = $derived(editsState.map[listId] ?? emptyEdits(listId));

  let filter = $state<'all' | 'mine' | 'hidden'>('all');
  let query = $state('');
  let limit = $state(PAGE);
  let adding = $state(false);
  let importing = $state(false);

  // The tag values an entry carries, for the small line under its text.
  const tagLine = (entries: Entry[]): string =>
    [...new Set(entries.flatMap(e => Object.values(e.tags ?? {}).flat()))].join(' · ');

  type Row = { key: string; v: string; sub: string; mine: boolean; hidden: boolean; index: number };
  const rows = $derived.by((): Row[] => {
    if (!list) return [];
    const mine = edits.added.map((e, index): Row => ({ key: 'm' + index, v: e.v, sub: tagLine([e]), mine: true, hidden: false, index }));
    const stock = stockRows(list, edits).map((r): Row => ({ key: 's' + r.v, v: r.v, sub: tagLine(r.entries), mine: false, hidden: r.hidden, index: -1 }));
    const q = query.trim().toLowerCase();
    return [...mine, ...stock]
      .filter(r => (filter === 'mine' ? r.mine : filter === 'hidden' ? r.hidden : true))
      .filter(r => !q || r.v.toLowerCase().includes(q));
  });

  const toggle = (r: Row) => updateEdits(listId, e => (r.hidden ? unhideText(e, r.v) : hideText(e, r.v)));
  const remove = (r: Row) => updateEdits(listId, e => removeAdded(e, r.index));
  const setFilter = (id: string) => {
    filter = id as typeof filter;
    limit = PAGE;
  };
</script>

<section class="group">
  <h2><a class="crumb" href={href('/manage')}>Manage</a><span class="sep" aria-hidden="true">›</span>{list?.label ?? 'Unknown'}</h2>
</section>

{#if !list}
  <p class="empty-note">No such list.</p>
{:else}
  <input class="msearch" type="search" aria-label="Search" placeholder="Search" bind:value={query} oninput={() => (limit = PAGE)} />
  <Chips
    label="Show"
    onpick={setFilter}
    items={[{ id: 'all', label: 'All', pressed: filter === 'all' }, { id: 'mine', label: 'Mine', pressed: filter === 'mine' }, { id: 'hidden', label: 'Hidden', pressed: filter === 'hidden' }]}
  />
  {#if rows.length}
    <ul class="card mlist">
      {#each rows.slice(0, limit) as r (r.key)}
        <li class="mrow" class:off={r.hidden}>
          <div>
            <span class="lt">{r.v}</span>{#if r.mine}<span class="badge">mine</span>{/if}
            {#if r.sub}<small>{r.sub}</small>{/if}
          </div>
          {#if r.mine}
            <button class="mbtn" aria-label={`Delete ${r.v}`} onclick={() => remove(r)}>Delete</button>
          {:else}
            <button class="mbtn" aria-label={`${r.hidden ? 'Unhide' : 'Hide'} ${r.v}`} onclick={() => toggle(r)}>{r.hidden ? 'Unhide' : 'Hide'}</button>
          {/if}
        </li>
      {/each}
    </ul>
    {#if rows.length > limit}
      <button class="btn ghost" onclick={() => (limit += PAGE)}>Show more ({rows.length - limit} left)</button>
    {/if}
  {:else}
    <p class="empty-note">{filter === 'all' && !query ? 'This list is empty.' : 'Nothing matches.'}</p>
  {/if}

  <div class="btn-row">
    <button class="btn" onclick={() => (adding = true)}>Add entry</button>
    <button class="btn ghost" onclick={() => (importing = true)}>Import file or text</button>
    <button class="btn ghost" onclick={() => downloadJson(`pocketrpg-${listId}.json`, exportEdits($state.snapshot(editsState.map), [listId]))}>Export this list</button>
  </div>
  {#if adding}<AddEntrySheet {list} onclose={() => (adding = false)} />{/if}
  {#if importing}<ImportSheet {list} onclose={() => (importing = false)} />{/if}
{/if}

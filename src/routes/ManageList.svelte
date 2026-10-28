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
  import Crumb from '../components/Crumb.svelte';

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
  <Crumb parent="Manage" href={href('/manage')} current={list?.label ?? 'Unknown'} />
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

<style>
  .msearch{width:100%;min-height:50px;border-radius:12px;border:2px solid var(--line);background:var(--surface);color:var(--ink);font:700 17px var(--f-body);padding:0 14px}
  .mlist{list-style:none;margin:0}
  .mrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid var(--line)}
  .mrow:first-child{border-top:0}
  .mrow>div{min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
  .mrow .lt{font-weight:700;font-size:16px;line-height:1.35;overflow-wrap:anywhere}
  .mrow small{flex-basis:100%;font:500 11px/1.3 var(--f-mono);color:var(--muted)}
  .mrow.off .lt{opacity:.5;text-decoration:line-through}
  .mbtn{min-height:44px;min-width:72px;border-radius:10px;border:2px solid var(--line);background:transparent;color:var(--ink);font:700 14px var(--f-body);padding:0 12px}
  .badge{font:700 10px/1 var(--f-body);text-transform:uppercase;letter-spacing:.08em;border:1px solid var(--accent);color:var(--accent);border-radius:6px;padding:2px 5px}
</style>

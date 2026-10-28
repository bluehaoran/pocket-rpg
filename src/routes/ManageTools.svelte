<script lang="ts">
  import { createConfirm } from '../lib/confirm.svelte.ts';
  import { lists, registry } from '../lib/content/index.ts';
  import { downloadJson } from '../lib/device.ts';
  import { editsState, replaceAllEdits, resetEdits } from '../lib/edits.svelte.ts';
  import { editCounts, emptyEdits } from '../lib/edits.ts';
  import { applyEditsFile, exportEdits, previewEditsFile, type FilePreview } from '../lib/editsfile.ts';
  import { ImportError } from '../lib/importer.ts';
  import GenTile from '../components/GenTile.svelte';
  import { href } from '../lib/router.svelte.ts';
  import Crumb from '../components/Crumb.svelte';

  // Registry order first, then any other list (e.g. surnames, used only as a Names add-on).
  const ids = [...new Set([...registry.tools.flatMap(t => (t.list ? [t.list] : [])), ...Object.keys(lists)])].filter(id => lists[id]);

  const sub = (id: string): string => {
    const c = editCounts(lists[id]!, editsState.map[id] ?? emptyEdits(id));
    const parts = [c.added ? `+${c.added}` : '', c.hidden ? `${c.hidden} hidden` : ''].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Stock';
  };

  const confirm = createConfirm();
  const reset = () => confirm.trigger(resetEdits);

  let preview = $state<FilePreview | undefined>();
  let error = $state('');

  async function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    preview = undefined;
    error = '';
    if (!file) return;
    try {
      preview = previewEditsFile(lists, $state.snapshot(editsState.map), await file.text());
    } catch (err) {
      error = err instanceof ImportError ? err.message : 'Could not read that file.';
    }
  }

  const summary = $derived.by(() => {
    if (!preview) return [];
    const lines = Object.entries(preview.perList).map(([id, p]) => {
      const bits = [`${p.fresh.length} new`, p.hide.length ? `${p.hide.length} to hide` : '', p.duplicates.length ? `${p.duplicates.length} already there` : '', p.invalid.length ? `${p.invalid.length} invalid` : ''];
      return `${lists[id]!.label}: ${bits.filter(Boolean).join(', ')}`;
    });
    if (preview.unknownLists.length) lines.push(`Not in this version, skipped: ${preview.unknownLists.join(', ')}`);
    return lines;
  });
  const nothingToApply = $derived(!preview || Object.values(preview.perList).every(p => !p.fresh.length && !p.hide.length));

  async function apply() {
    if (!preview) return;
    await replaceAllEdits(applyEditsFile(lists, $state.snapshot(editsState.map), preview));
    preview = undefined;
  }
</script>

<section class="group">
  <Crumb parent="Tools" href={href('/tools')} current="Manage" />
  <p class="hint">Add, hide or import entries. Saved on this device only.</p>
</section>

<section class="gens">
  {#each ids as id (id)}
    <GenTile href={href(`/manage/${id}`)} label={lists[id]!.label} sub={sub(id)} />
  {/each}
</section>

<div class="btn-row">
  <button class="btn ghost" onclick={() => downloadJson('pocketrpg-edits.json', exportEdits($state.snapshot(editsState.map)))}>Export all edits</button>
  <label class="btn ghost">
    Import edits file
    <input type="file" accept=".json,application/json" hidden onchange={pick} />
  </label>
  <button class="btn ghost" aria-pressed={confirm.armed} onclick={reset}>{confirm.armed ? 'Tap again to reset' : 'Reset all edits'}</button>
</div>

{#if error}
  <p class="empty-note" role="alert">{error}</p>
{/if}
{#if preview}
  <div class="card" role="status">
    {#each summary as line, i (i)}<div class="lt">{line}</div>{:else}<div class="lt">Nothing in this file.</div>{/each}
  </div>
  <button class="btn" disabled={nothingToApply} onclick={apply}>Apply</button>
{/if}

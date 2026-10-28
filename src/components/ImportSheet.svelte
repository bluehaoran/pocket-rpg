<script lang="ts">
  import type { ToolList } from '../lib/content/types.ts';
  import { editsState, updateEdits } from '../lib/edits.svelte.ts';
  import { addEntries, emptyEdits } from '../lib/edits.ts';
  import { exampleJson, exampleText, ImportError, parseImport } from '../lib/importer.ts';
  import TagPicker from './TagPicker.svelte';
  import Sheet from './Sheet.svelte';

  /** `list` is the stock list: duplicates are checked against it and the entries already added. */
  let { list, onclose }: { list: ToolList; onclose: () => void } = $props();

  const SHOWN_INVALID = 5;
  let text = $state('');
  let fileKind = $state<'json' | 'text' | undefined>();
  let picked = $state<Record<string, string>>({});
  let note = $state('');
  let jsonPre: HTMLElement | undefined = $state();
  let textPre: HTMLElement | undefined = $state();

  const mods = $derived(Object.entries(list.modifiers));
  const kind = $derived(fileKind ?? (/^\s*[[{]/.test(text) ? 'json' : 'text'));

  const result = $derived.by(() => {
    if (!text.trim()) return {};
    try {
      const current = $state.snapshot(editsState.map[list.id]) ?? emptyEdits(list.id);
      return { preview: parseImport(list, current, text, kind, $state.snapshot(picked)) };
    } catch (err) {
      return { error: err instanceof ImportError ? err.message : 'Could not read that.' };
    }
  });
  const fresh = $derived(result.preview?.fresh ?? []);

  async function chooseFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    text = await file.text();
    fileKind = /\.json$/i.test(file.name) ? 'json' : 'text';
  }

  async function doImport() {
    const entries = fresh;
    await updateEdits(list.id, e => addEntries(list, e, entries).edits);
    onclose();
  }

  async function copy(value: string, el?: HTMLElement) {
    try {
      await navigator.clipboard.writeText(value);
      note = 'Copied.';
    } catch {
      if (el) getSelection()?.selectAllChildren(el);
      note = 'Select the text and copy it yourself.';
    }
  }
</script>

<Sheet title={`Import into ${list.label}`} {onclose}>
  <label class="btn ghost">
    Choose .json or .txt file
    <input type="file" accept=".json,.txt,text/plain,application/json" hidden onchange={chooseFile} />
  </label>
  <textarea class="mtext" aria-label="Paste text" placeholder="…or paste JSON, or one entry per line" bind:value={text} oninput={() => (fileKind = undefined)}></textarea>

  {#if mods.length}
    <div class="eyebrow">Apply to every plain line</div>
    <TagPicker modifiers={list.modifiers} bind:picked titles={false} />
  {/if}

  {#if result.error}
    <p class="empty-note" role="alert">{result.error}</p>
  {:else}
    {#if result.preview}
      <div class="card" role="status">
        <div class="lt">{fresh.length} new, {result.preview.duplicates.length} already there (skipped){result.preview.invalid.length ? `, ${result.preview.invalid.length} invalid` : ''}</div>
        {#each result.preview.invalid.slice(0, SHOWN_INVALID) as bad}
          <small>{bad.raw} — {bad.reason}</small>
        {/each}
        {#if result.preview.invalid.length > SHOWN_INVALID}<small>…and {result.preview.invalid.length - SHOWN_INVALID} more</small>{/if}
      </div>
    {/if}
    <button class="btn" disabled={!fresh.length} onclick={doImport}>Import {fresh.length}</button>
  {/if}

  <details class="fmtbox">
    <summary class="eyebrow">Format for this list</summary>
    <p class="hint">JSON with an "entries" list{mods.length ? ', using these tag values' : ''}:</p>
    <pre class="fmt" bind:this={jsonPre}>{exampleJson(list)}</pre>
    <button class="btn ghost" onclick={() => copy(exampleJson(list), jsonPre)}>Copy JSON example</button>
    <p class="hint">Or plain text, one entry per line:</p>
    <pre class="fmt" bind:this={textPre}>{exampleText(list)}</pre>
    <button class="btn ghost" onclick={() => copy(exampleText(list), textPre)}>Copy text example</button>
    {#if note}<p class="hint" role="note">{note}</p>{/if}
  </details>
  <button class="btn ghost" onclick={onclose}>Close</button>
</Sheet>

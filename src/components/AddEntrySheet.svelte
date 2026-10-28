<script lang="ts">
  import type { ToolList } from '../lib/content/types.ts';
  import { editsState, updateEdits } from '../lib/edits.svelte.ts';
  import { addEntries, emptyEdits } from '../lib/edits.ts';
  import TagPicker from './TagPicker.svelte';
  import Sheet from './Sheet.svelte';

  /** `list` is the stock list: duplicates are checked against it and the entries already added. */
  let { list, onclose }: { list: ToolList; onclose: () => void } = $props();

  let text = $state('');
  let picked = $state<Record<string, string>>({});
  let error = $state('');

  async function submit(another: boolean) {
    const entry = { v: text, ...(Object.keys(picked).length ? { tags: { ...picked } } : {}) };
    const current = $state.snapshot(editsState.map[list.id]) ?? emptyEdits(list.id);
    if (!addEntries(list, current, [entry]).added.length) {
      error = 'Already in this list.';
      return;
    }
    await updateEdits(list.id, e => addEntries(list, e, [entry]).edits);
    error = '';
    text = '';
    if (!another) onclose();
  }
</script>

<Sheet title={`Add to ${list.label}`} {onclose}>
  <input type="text" aria-label="Text" placeholder="Text" bind:value={text} oninput={() => (error = '')} />
  <TagPicker modifiers={list.modifiers} bind:picked />
  {#if error}<p class="empty-note" role="alert">{error}</p>{/if}
  <button class="btn" disabled={!text.trim()} onclick={() => submit(false)}>Add</button>
  <button class="btn ghost" disabled={!text.trim()} onclick={() => submit(true)}>Add and another</button>
  <button class="btn ghost" onclick={onclose}>Close</button>
</Sheet>

<script lang="ts">
  import Part from './Part.svelte';
  import { renderSentence } from '../lib/engine/template.ts';

  interface Props {
    template: string;
    fields: { id: string; label: string }[];
    values: Record<string, unknown>;
    /** Tappable parts when set; read-only bold values otherwise. */
    onpick?: (fieldId: string) => void;
    plain?: boolean;
  }
  let { template, fields, values, onpick, plain = false }: Props = $props();

  const r = $derived(renderSentence(template, fields, values, { plain }));
</script>

<p>
  {#each r.tokens as t, i (i)}
    {#if t.kind === 'br'}<br />
    {:else if t.kind === 'text'}{t.text}
    {:else}
      {@const cls = t.id === 'name' ? 'nm' : ''}
      {#if onpick && !plain}
        <span class={cls}><Part empty={t.empty} onclick={() => onpick(t.id)}>{t.text}</Part></span>
      {:else}
        <span class={cls}><b class="pv" class:empty={t.empty}>{t.empty ? '—' : t.text}</b></span>
      {/if}
    {/if}
  {/each}
</p>

<style>
  .pv{font-weight:700}
  .pv.empty{color:var(--muted)}
</style>

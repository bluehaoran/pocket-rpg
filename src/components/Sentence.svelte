<script lang="ts">
  import { renderSentence } from '../lib/engine/template.ts';

  interface Props {
    template: string;
    fields: { id: string; label: string }[];
    values: Record<string, unknown>;
    /** Tappable parts when set; read-only bold values otherwise. */
    onpick?: (fieldId: string) => void;
    plain?: boolean;
    /** Ids of fields the template used, reported to the parent so it can list the rest as rows. */
    used?: Set<string>;
  }
  let { template, fields, values, onpick, plain = false, used = $bindable(new Set()) }: Props = $props();

  const r = $derived(renderSentence(template, fields, values, { plain }));
  $effect(() => {
    used = r.used;
  });
</script>

<p>
  {#each r.tokens as t, i (i)}
    {#if t.kind === 'br'}<br />
    {:else if t.kind === 'text'}{t.text}
    {:else}
      {@const cls = t.id === 'name' ? 'nm' : ''}
      {#if onpick && !plain}
        <span class={cls}><button class="part" class:empty={t.empty} onclick={() => onpick(t.id)}>{t.text}</button></span>
      {:else}
        <span class={cls}><b class="pv" class:empty={t.empty}>{t.empty ? '—' : t.text}</b></span>
      {/if}
    {/if}
  {/each}
</p>

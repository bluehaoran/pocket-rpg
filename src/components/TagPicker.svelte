<script lang="ts">
  import type { ToolList } from '../lib/content/types.ts';
  import { valueLabel } from '../lib/tools.ts';
  import Chips from './Chips.svelte';

  /**
   * One chip row per modifier of a list. `picked` maps modifier key to the chosen value; tapping the chosen
   * value again clears it, since an entry with no value for a tag matches any value.
   */
  let { modifiers, picked = $bindable(), titles = true }: {
    modifiers: ToolList['modifiers'];
    picked: Record<string, string>;
    /** Show each modifier's label above its chips. */
    titles?: boolean;
  } = $props();

  function pick(key: string, value: string) {
    if (picked[key] === value) delete picked[key];
    else picked[key] = value;
  }
</script>

{#each Object.entries(modifiers) as [key, decl] (key)}
  {#if titles}<div class="eyebrow">{decl.label}</div>{/if}
  <Chips
    label={decl.label}
    onpick={v => pick(key, v)}
    items={decl.values.map(v => ({ id: v, label: valueLabel(decl, v), pressed: picked[key] === v }))}
  />
{/each}

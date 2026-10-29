<script lang="ts" generics="T extends string | number">
  import Icon from './Icon.svelte';

  let {
    options,
    value = $bindable(),
    label,
    class: cls = ''
  }: { options: { value: T; label?: string }[]; value: T; label: string; class?: string } = $props();
</script>

<div class="seg {cls}" role="group" aria-label={label}>
  {#each options as o (o.value)}
    <button type="button" aria-pressed={value === o.value} onclick={() => (value = o.value)}>
      {#if value === o.value}<Icon name="check" size="18px" stroke={3} />{/if}{o.label ?? o.value}
    </button>
  {/each}
</div>

<style>
  .seg{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:6px}
  .seg button{min-height:58px;border-radius:12px;border:2px solid var(--line);background:var(--surface);font:700 22px/1 var(--f-mono);font-variant-numeric:tabular-nums;display:flex;align-items:center;justify-content:center;gap:4px}
  .seg button[aria-pressed="true"]{background:var(--sel);border-color:var(--sel);color:var(--sel-ink)}
  .seg.dtype{grid-template-columns:repeat(4,1fr);grid-auto-flow:row}
  .seg.dtype button{font-size:19px}
</style>

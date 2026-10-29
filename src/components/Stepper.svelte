<script lang="ts">
  import Icon from './Icon.svelte';

  let { value = $bindable(), min, max, label }: { value: number; min: number; max: number; label: string } = $props();
</script>

<div class="stepper" role="group" aria-label={label}>
  <button type="button" aria-label="Decrease {label}" disabled={value <= min} onclick={() => value--}><Icon name="minus" size="28px" /></button>
  <output aria-live="polite">{value}</output>
  <button type="button" aria-label="Increase {label}" disabled={value >= max} onclick={() => value++}><Icon name="plus" size="28px" /></button>
</div>

<style>
  .stepper{display:grid;grid-template-columns:64px minmax(0,1fr) 64px;align-items:stretch;min-height:64px;border:2px solid var(--line);border-radius:14px;background:var(--surface);overflow:hidden}
  .stepper button{border:0;background:var(--sunk);font:700 28px/1 var(--f-mono)}
  .stepper button:disabled{opacity:.35;cursor:not-allowed}
  .stepper output{display:grid;place-items:center;font:700 30px/1 var(--f-mono);font-variant-numeric:tabular-nums}
</style>

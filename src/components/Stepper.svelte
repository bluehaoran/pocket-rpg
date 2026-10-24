<script lang="ts">
  let { value = $bindable(), min, max, label }: { value: number; min: number; max: number; label: string } = $props();
</script>

<div class="stepper" role="group" aria-label={label}>
  <button type="button" aria-label="Decrease {label}" disabled={value <= min} onclick={() => value--}>−</button>
  <output aria-live="polite">{value}</output>
  <button type="button" aria-label="Increase {label}" disabled={value >= max} onclick={() => value++}>+</button>
</div>

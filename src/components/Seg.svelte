<script lang="ts" generics="T extends string | number">
  let {
    options,
    value = $bindable(),
    label,
    class: cls = ''
  }: { options: { value: T; label?: string }[]; value: T; label: string; class?: string } = $props();
</script>

<div class="seg {cls}" role="group" aria-label={label}>
  {#each options as o (o.value)}
    <button type="button" aria-pressed={value === o.value} onclick={() => (value = o.value)}>{o.label ?? o.value}</button>
  {/each}
</div>

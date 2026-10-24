<script lang="ts">
  // Pip positions on a 3x3 grid, as in the mockup.
  const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  let { value, size = '', state = '' }: { value: number; size?: 'sm' | 'lg' | ''; state?: 'ok' | 'ex' | 'no' | '' } = $props();
  const pips = $derived(PIPS[value]);
</script>

{#if pips}
  <span class="die {size} {state}" role="img" aria-label="d6 showing {value}">
    {#each { length: 9 } as _, i (i)}<i class:on={pips.includes(i)}></i>{/each}
  </span>
{:else}
  <span class="die {size} {state}" role="img" aria-label={String(value)}></span>
{/if}

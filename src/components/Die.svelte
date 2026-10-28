<script lang="ts">
  // Pip positions on a 3x3 grid, as in the mockup.
  const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  let { value, size = '', state = '' }: { value: number; size?: 'sm' | 'lg' | ''; state?: 'ok' | 'ex' | 'no' | '' } = $props();
  const pips = $derived(PIPS[value]);
</script>

<span class="die {size} {state}" role="img" aria-label={pips ? `d6 showing ${value}` : String(value)}>
  {#if pips}{#each { length: 9 } as _, i (i)}<i class:on={pips.includes(i)}></i>{/each}{/if}
</span>

<style>
  .die{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);width:40px;height:40px;padding:6px;gap:2px;border-radius:9px;background:var(--sunk);border:1px solid var(--line);flex:none}
  .die i{border-radius:50%}
  .die i.on{background:var(--ink)}
  .die.sm{width:30px;height:30px;padding:5px;border-radius:7px}
  .die.lg{width:50px;height:50px;padding:8px;border-radius:11px}
  .die.ok{background:var(--accent-soft);border:2px solid var(--accent)}
  .die.ok i.on{background:var(--accent)}
  .die.ex{border:3px solid var(--pin)}
  .die.ex i.on{background:var(--pin)}
  .die.no{opacity:.4}
</style>

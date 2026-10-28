<script lang="ts">
  import Chips from './Chips.svelte';

  /** A labelled Off/On pair of chips. */
  let { label, on, onchange }: { label: string; on: boolean; onchange: (on: boolean) => void } = $props();
</script>

<div class="group">
  <div class="eyebrow">{label}</div>
  <Chips {label} items={[{ id: 'off', label: 'Off', pressed: !on }, { id: 'on', label: 'On', pressed: on }]} onpick={v => onchange(v === 'on')} />
</div>

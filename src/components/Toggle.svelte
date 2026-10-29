<script lang="ts">
  import Icon from './Icon.svelte';

  // An on/off row: label on the left, a tick (on) or cross (off) tile on the right. The whole row is the switch.
  // Pick-one choices use chips or Seg instead, so a chip means "choose" and a row means "on or off".
  let { label, on, onchange }: { label: string; on: boolean; onchange: (on: boolean) => void } = $props();
</script>

<button type="button" class="toggle" role="switch" aria-checked={on} onclick={() => onchange(!on)}>
  <span class="lab">{label}</span>
  <span class="tile"><Icon name={on ? 'check' : 'cross'} size="22px" stroke={3} /></span>
</button>

<style>
  .toggle{width:100%;min-height:56px;padding:4px 0;display:flex;align-items:center;gap:14px;border:0;border-bottom:1px solid var(--line);background:none;border-radius:0;text-align:right;font:400 17px/1.3 var(--f-body);color:var(--ink)}
  .toggle:last-child{border-bottom:0}
  .toggle:focus-visible{outline:var(--ring);outline-offset:-2px;border-radius:8px}
  .lab{flex:1;min-width:0}
  .tile{width:38px;height:38px;flex:none;border-radius:10px;border:2px solid var(--outline);background:var(--bg);color:var(--muted);display:grid;place-items:center}
  .toggle[aria-checked="true"] .tile{background:var(--sel);border-color:var(--sel);color:var(--sel-ink)}
</style>

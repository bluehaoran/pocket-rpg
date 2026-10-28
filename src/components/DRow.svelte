<script lang="ts">
  // A tappable "label / value ›" row.
  let { label, value, empty = 'Not set', question = false, onclick }: {
    label: string; value: string; empty?: string; question?: boolean; onclick: () => void;
  } = $props();
</script>

<button class="drow" {onclick}>
  <span class={question ? 'qt' : 'eyebrow'}>{label}</span>
  <span class="v" class:empty={!value}>{value || empty}</span>
  <span class="chev" aria-hidden="true">›</span>
</button>

<style>
  .drow{all:unset;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);font:400 17px/1.3 var(--f-body)}
  .drow:last-child{border-bottom:0}
  .drow:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:6px}
  .drow .eyebrow{grid-column:1}
  .drow .v{grid-column:1;font-weight:700;color:var(--accent)}
  .drow .v.empty{color:var(--muted);font-weight:400;font-style:italic}
  .drow .chev{grid-column:2;grid-row:1/span 2;color:var(--muted);font:700 18px/1 var(--f-mono)}
  .drow .qt{grid-column:1;font:700 16px/1.3 var(--f-body);color:var(--ink)}
</style>

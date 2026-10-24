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
